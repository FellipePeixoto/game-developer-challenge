import { Circle, Rectangle } from 'pixi.js'

export class Physics {
  readonly bounds = new Rectangle()
  readonly island = new Circle()
  readonly ship = new Rectangle()
  shipRotation = 0
  readonly obstacles: Circle[] = [this.island]

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

  blocksProjectile(start: { x: number; y: number }, end: { x: number; y: number }, radius: number): boolean {
    if (!this.bounds.contains(end.x, end.y)) return true

    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy
    return this.obstacles.some(obstacle => {
      const projection = lengthSquared > 0
        ? ((obstacle.x - start.x) * dx + (obstacle.y - start.y) * dy) / lengthSquared
        : 0
      const fraction = Math.max(0, Math.min(1, projection))
      const x = start.x + dx * fraction - obstacle.x
      const y = start.y + dy * fraction - obstacle.y
      return x * x + y * y <= (obstacle.radius + radius) ** 2
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

  private contact(box: Rectangle, rotation: number, x: number, y: number, obstacle: Circle): { x: number; y: number } | undefined {
    const cosine = Math.cos(rotation)
    const sine = Math.sin(rotation)
    // Bring the circle into the rectangle's local coordinates.
    const localX = (obstacle.x - x) * cosine + (obstacle.y - y) * sine
    const localY = -(obstacle.x - x) * sine + (obstacle.y - y) * cosine
    const halfWidth = box.width / 2
    const halfHeight = box.height / 2
    const closestX = Math.max(-halfWidth, Math.min(halfWidth, localX))
    const closestY = Math.max(-halfHeight, Math.min(halfHeight, localY))
    if (!new Circle(localX, localY, obstacle.radius).contains(closestX, closestY)) return

    let normalX = closestX - localX
    let normalY = closestY - localY
    const distance = Math.hypot(normalX, normalY)
    let depth = obstacle.radius - distance
    if (distance > 0) {
      normalX /= distance
      normalY /= distance
    } else if (halfWidth - Math.abs(localX) < halfHeight - Math.abs(localY)) {
      normalX = localX >= 0 ? -1 : 1
      normalY = 0
      depth += halfWidth - Math.abs(localX)
    } else {
      normalX = 0
      normalY = localY >= 0 ? -1 : 1
      depth += halfHeight - Math.abs(localY)
    }
    return {
      x: (normalX * cosine - normalY * sine) * (depth + 0.000001),
      y: (normalX * sine + normalY * cosine) * (depth + 0.000001),
    }
  }
}
