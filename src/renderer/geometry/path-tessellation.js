/**
 * Path Tessellation
 *
 * Converts vector paths to triangles for GPU rendering.
 */
const DEFAULT_FLATNESS = 0.25;
const DEFAULT_MAX_SEGMENTS = 64;
/**
 * Tessellate a fill path to triangles.
 */
export function tessellateFill(path, options = {}) {
    const flatness = options.flatness ?? DEFAULT_FLATNESS;
    const maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
    // Flatten path to line segments
    const points = flattenPath(path, flatness, maxSegments);
    if (points.length < 3) {
        return { vertices: new Float32Array(0), indices: new Uint16Array(0) };
    }
    // Use ear clipping for simple polygon triangulation
    const vertices = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
        vertices[i * 2] = points[i].x;
        vertices[i * 2 + 1] = points[i].y;
    }
    const indices = triangulatePolygon(points);
    return { vertices, indices };
}
/**
 * Tessellate a stroke path.
 */
export function tessellateStroke(path, _strokeWidth, options = {}) {
    const flatness = options.flatness ?? DEFAULT_FLATNESS;
    const maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
    void _strokeWidth; // Used for offset calculation
    // Flatten path to line segments
    const points = flattenPath(path, flatness, maxSegments);
    if (points.length < 2) {
        return { vertices: new Float32Array(0), indices: new Uint16Array(0) };
    }
    // Generate stroke geometry with normals
    const vertexData = [];
    const indexData = [];
    let baseVertex = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        // Calculate segment direction and normal
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0)
            continue;
        const nx = -dy / len;
        const ny = dx / len;
        // Add 4 vertices (2 on each side of the line)
        // Vertex 0: p0 - normal
        vertexData.push(p0.x, p0.y, -nx, -ny);
        // Vertex 1: p0 + normal
        vertexData.push(p0.x, p0.y, nx, ny);
        // Vertex 2: p1 - normal
        vertexData.push(p1.x, p1.y, -nx, -ny);
        // Vertex 3: p1 + normal
        vertexData.push(p1.x, p1.y, nx, ny);
        // Add 2 triangles
        indexData.push(baseVertex, baseVertex + 1, baseVertex + 2, baseVertex + 1, baseVertex + 3, baseVertex + 2);
        baseVertex += 4;
    }
    // Handle closed paths and joins (check for 'Z' command to determine if closed)
    const isClosed = path.commands.some(cmd => cmd.type === 'Z');
    if (isClosed && points.length > 2) {
        // Add closing segment
        const p0 = points[points.length - 1];
        const p1 = points[0];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            vertexData.push(p0.x, p0.y, -nx, -ny);
            vertexData.push(p0.x, p0.y, nx, ny);
            vertexData.push(p1.x, p1.y, -nx, -ny);
            vertexData.push(p1.x, p1.y, nx, ny);
            indexData.push(baseVertex, baseVertex + 1, baseVertex + 2, baseVertex + 1, baseVertex + 3, baseVertex + 2);
        }
    }
    return {
        vertices: new Float32Array(vertexData),
        indices: new Uint16Array(indexData),
    };
}
/**
 * Flatten a path to line segments.
 */
export function flattenPath(path, flatness = DEFAULT_FLATNESS, maxSegments = DEFAULT_MAX_SEGMENTS) {
    const points = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    for (const cmd of path.commands) {
        switch (cmd.type) {
            case 'M':
                currentX = cmd.x;
                currentY = cmd.y;
                startX = currentX;
                startY = currentY;
                points.push({ x: currentX, y: currentY });
                break;
            case 'L':
                currentX = cmd.x;
                currentY = cmd.y;
                points.push({ x: currentX, y: currentY });
                break;
            case 'C': {
                // Flatten cubic bezier
                const curvePoints = flattenCubicBezier(currentX, currentY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y, flatness, maxSegments);
                points.push(...curvePoints);
                currentX = cmd.x;
                currentY = cmd.y;
                break;
            }
            case 'Z':
                // Don't add duplicate closing point - polygon is implicitly closed
                // for triangulation (last vertex connects back to first)
                currentX = startX;
                currentY = startY;
                break;
        }
    }
    return points;
}
/**
 * Flatten a cubic bezier curve.
 */
function flattenCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, flatness, maxSegments) {
    const points = [];
    const flatness2 = flatness * flatness;
    function subdivide(ax, ay, bx, by, cx, cy, dx, dy, depth) {
        if (depth > maxSegments) {
            points.push({ x: dx, y: dy });
            return;
        }
        // Check if curve is flat enough
        const ux = 3 * bx - 2 * ax - dx;
        const uy = 3 * by - 2 * ay - dy;
        const vx = 3 * cx - 2 * dx - ax;
        const vy = 3 * cy - 2 * dy - ay;
        const maxDist2 = Math.max(ux * ux + uy * uy, vx * vx + vy * vy);
        if (maxDist2 <= 16 * flatness2) {
            points.push({ x: dx, y: dy });
            return;
        }
        // Subdivide at midpoint
        const abx = (ax + bx) / 2, aby = (ay + by) / 2;
        const bcx = (bx + cx) / 2, bcy = (by + cy) / 2;
        const cdx = (cx + dx) / 2, cdy = (cy + dy) / 2;
        const abcx = (abx + bcx) / 2, abcy = (aby + bcy) / 2;
        const bcdx = (bcx + cdx) / 2, bcdy = (bcy + cdy) / 2;
        const midx = (abcx + bcdx) / 2, midy = (abcy + bcdy) / 2;
        subdivide(ax, ay, abx, aby, abcx, abcy, midx, midy, depth + 1);
        subdivide(midx, midy, bcdx, bcdy, cdx, cdy, dx, dy, depth + 1);
    }
    subdivide(x0, y0, x1, y1, x2, y2, x3, y3, 0);
    return points;
}
/**
 * Simple ear-clipping polygon triangulation.
 */
function triangulatePolygon(points) {
    if (points.length < 3) {
        return new Uint16Array(0);
    }
    const indices = [];
    const remaining = points.map((_, i) => i);
    // Simple ear clipping
    while (remaining.length > 3) {
        let earFound = false;
        for (let i = 0; i < remaining.length; i++) {
            const prev = remaining[(i + remaining.length - 1) % remaining.length];
            const curr = remaining[i];
            const next = remaining[(i + 1) % remaining.length];
            if (isEar(points, remaining, prev, curr, next)) {
                indices.push(prev, curr, next);
                remaining.splice(i, 1);
                earFound = true;
                break;
            }
        }
        if (!earFound) {
            // Fallback: just create a fan (may produce bad triangles)
            break;
        }
    }
    // Add final triangle
    if (remaining.length === 3) {
        indices.push(remaining[0], remaining[1], remaining[2]);
    }
    return new Uint16Array(indices);
}
/**
 * Check if a vertex forms an ear.
 */
function isEar(points, remaining, prev, curr, next) {
    const p0 = points[prev];
    const p1 = points[curr];
    const p2 = points[next];
    // Check if triangle is convex (counter-clockwise)
    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (cross <= 0)
        return false;
    // Check if any other point is inside the triangle
    for (const idx of remaining) {
        if (idx === prev || idx === curr || idx === next)
            continue;
        if (pointInTriangle(points[idx], p0, p1, p2)) {
            return false;
        }
    }
    return true;
}
/**
 * Check if a point is inside a triangle.
 */
function pointInTriangle(p, a, b, c) {
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
}
function sign(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
/**
 * Create a rectangle tessellation.
 */
export function tessellateRect(x, y, width, height) {
    const vertices = new Float32Array([
        x, y,
        x + width, y,
        x + width, y + height,
        x, y + height,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    return { vertices, indices };
}
/**
 * Create a rounded rectangle tessellation.
 */
export function tessellateRoundedRect(x, y, width, height, radius, segments = 8) {
    // Clamp radius
    const maxRadius = Math.min(width, height) / 2;
    const r = Math.min(radius, maxRadius);
    if (r <= 0) {
        return tessellateRect(x, y, width, height);
    }
    const points = [];
    // Generate corner arcs
    const corners = [
        { cx: x + width - r, cy: y + r, startAngle: -Math.PI / 2 }, // Top-right
        { cx: x + width - r, cy: y + height - r, startAngle: 0 }, // Bottom-right
        { cx: x + r, cy: y + height - r, startAngle: Math.PI / 2 }, // Bottom-left
        { cx: x + r, cy: y + r, startAngle: Math.PI }, // Top-left
    ];
    for (const corner of corners) {
        for (let i = 0; i <= segments; i++) {
            const angle = corner.startAngle + (Math.PI / 2) * (i / segments);
            points.push({
                x: corner.cx + Math.cos(angle) * r,
                y: corner.cy + Math.sin(angle) * r,
            });
        }
    }
    // Convert to vertices
    const vertices = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
        vertices[i * 2] = points[i].x;
        vertices[i * 2 + 1] = points[i].y;
    }
    // Simple fan triangulation from center
    const cx = x + width / 2;
    const cy = y + height / 2;
    // Add center point
    const newVertices = new Float32Array(vertices.length + 2);
    newVertices.set(vertices);
    newVertices[vertices.length] = cx;
    newVertices[vertices.length + 1] = cy;
    const centerIdx = points.length;
    const indices = [];
    for (let i = 0; i < points.length; i++) {
        indices.push(centerIdx, i, (i + 1) % points.length);
    }
    return {
        vertices: newVertices,
        indices: new Uint16Array(indices),
    };
}
//# sourceMappingURL=path-tessellation.js.map