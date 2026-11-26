import { Rectangle } from 'pixi.js'

export class Physics {
  readonly bounds = new Rectangle()
  readonly ship = new Rectangle()
  shipRotation = 0
  readonly obstacles: Rectangle[] = []

  move(collider: Rectangle, deltaX: number, deltaY: number, rotation = this.shipRotation): boolean {
    const { bounds } = this
    const cosine = Math.cos(rotation)
    const sine = Math.sin(rotation)
    const halfWidth = collider.width / 2
    const halfHeight = collider.height / 2
    const extentX = Math.abs(cosine) * halfWidth + Math.abs(sine) * halfHeight
    const extentY = Math.abs(sine) * halfWidth + Math.abs(cosine) * halfHeight
    const minX = bounds.x + extentX
    const maxX = bounds.right - extentX
    const minY = bounds.y + extentY
    const maxY = bounds.bottom - extentY
    if (minX > maxX || minY > maxY) return false
    let x = Math.max(minX, Math.min(maxX, collider.x + halfWidth + deltaX))
    let y = Math.max(minY, Math.min(maxY, collider.y + halfHeight + deltaY))

    for (let pass = 0; pass < 4; pass++) {
      let corrected = false
      for (const obstacle of this.obstacles) {
        const contact = this.contact(collider, rotation, x, y, obstacle)
        if (!contact) continue
        // Resolve only the blocked component; retain motion along the surface.
        x = Math.max(minX, Math.min(maxX, x + contact.x))
        y = Math.max(minY, Math.min(maxY, y + contact.y))
        corrected = true
      }
      if (!corrected) break
    }

    // Conflicting contacts must never force the body through another obstacle.
    if (this.obstacles.some(obstacle => this.contact(collider, rotation, x, y, obstacle))) return false

    collider.x = x - halfWidth
    collider.y = y - halfHeight
    this.shipRotation = rotation
    return true
  }

  canPlace(box: Rectangle, rotation: number, x: number, y: number): boolean {
    const cosine = Math.abs(Math.cos(rotation))
    const sine = Math.abs(Math.sin(rotation))
    const extentX = (cosine * box.width + sine * box.height) / 2
    const extentY = (sine * box.width + cosine * box.height) / 2
    const { bounds } = this
    return x - extentX >= bounds.left && x + extentX <= bounds.right
      && y - extentY >= bounds.top && y + extentY <= bounds.bottom
      && !this.obstacles.some(obstacle => this.contact(box, rotation, x, y, obstacle))
  }

  overlapsShip(box: Rectangle, rotation: number, x: number, y: number): boolean {
    return this.contact(box, rotation, x, y, this.ship, this.shipRotation) !== undefined
  }

  blocksProjectile(start: { x: number; y: number }, end: { x: number; y: number }, radius: number): boolean {
    if (!this.bounds.contains(end.x, end.y)) return true

    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy
    return this.obstacles.some(({ left, top, right, bottom }) => {
      // A rectangle expanded by the projectile radius has straight sides and rounded corners.
      if (this.segmentHitsBox(start.x, start.y, dx, dy, left - radius, top, right + radius, bottom)
        || this.segmentHitsBox(start.x, start.y, dx, dy, left, top - radius, right, bottom + radius)) {
        return true
      }

      return [[left, top], [right, top], [left, bottom], [right, bottom]].some(([x, y]) => {
        const projection = lengthSquared > 0
          ? ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared
          : 0
        const fraction = Math.max(0, Math.min(1, projection))
        const distanceX = start.x + dx * fraction - x
        const distanceY = start.y + dy * fraction - y
        return distanceX ** 2 + distanceY ** 2 <= radius ** 2
      })
    })
  }

  shipCorners(): number[] {
    const { ship, shipRotation } = this
    const centerX = ship.x + ship.width / 2
    const centerY = ship.y + ship.height / 2
    const cosine = Math.cos(shipRotation)
    const sine = Math.sin(shipRotation)
    return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).flatMap(([x, y]) => [
      centerX + x * ship.width / 2 * cosine - y * ship.height / 2 * sine,
      centerY + x * ship.width / 2 * sine + y * ship.height / 2 * cosine,
    ])
  }

  private segmentHitsBox(
    x: number, y: number, dx: number, dy: number,
    left: number, top: number, right: number, bottom: number,
  ): boolean {
    let entry = 0
    let exit = 1
    for (const [start, direction, min, max] of [[x, dx, left, right], [y, dy, top, bottom]]) {
      if (direction === 0) {
        if (start < min || start > max) return false
        continue
      }
      const first = (min - start) / direction
      const second = (max - start) / direction
      entry = Math.max(entry, Math.min(first, second))
      exit = Math.min(exit, Math.max(first, second))
      if (entry > exit) return false
    }
    return true
  }

  private contact(
    box: Rectangle, rotation: number, x: number, y: number, obstacle: Rectangle, obstacleRotation = 0,
  ): { x: number; y: number } | undefined {
    const cosine = Math.cos(rotation)
    const sine = Math.sin(rotation)
    const obstacleCosine = Math.cos(obstacleRotation)
    const obstacleSine = Math.sin(obstacleRotation)
    const obstacleHalfWidth = obstacle.width / 2
    const obstacleHalfHeight = obstacle.height / 2
    const offsetX = x - (obstacle.x + obstacleHalfWidth)
    const offsetY = y - (obstacle.y + obstacleHalfHeight)
    let depth = Infinity
    let normalX = 0
    let normalY = 0

    // Test the separating axes of both rectangles.
    for (const [axisX, axisY] of [
      [obstacleCosine, obstacleSine], [-obstacleSine, obstacleCosine], [cosine, sine], [-sine, cosine],
    ]) {
      const shipExtent = Math.abs(axisX * cosine + axisY * sine) * box.width / 2
        + Math.abs(-axisX * sine + axisY * cosine) * box.height / 2
      const obstacleExtent = Math.abs(axisX * obstacleCosine + axisY * obstacleSine) * obstacleHalfWidth
        + Math.abs(-axisX * obstacleSine + axisY * obstacleCosine) * obstacleHalfHeight
      const distance = offsetX * axisX + offsetY * axisY
      const overlap = shipExtent + obstacleExtent - Math.abs(distance)
      if (overlap <= 0) return
      if (overlap < depth) {
        depth = overlap
        const direction = distance < 0 ? -1 : 1
        normalX = axisX * direction
        normalY = axisY * direction
      }
    }

    return { x: normalX * (depth + 0.000001), y: normalY * (depth + 0.000001) }
  }
}
