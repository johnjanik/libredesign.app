/**
 * Batch Generator
 *
 * Generates draw batches from scene graph nodes for efficient rendering.
 */
/**
 * Batch builder - accumulates draw commands
 */
export class BatchBuilder {
    commands = [];
    /**
     * Add a fill command.
     */
    addFill(nodeId, transform, color, vertices, indices, opacity = 1, blendMode = 'NORMAL') {
        this.commands.push({
            type: 'fill',
            nodeId,
            transform,
            color,
            vertices,
            indices,
            opacity,
            blendMode,
        });
    }
    /**
     * Add a stroke command.
     */
    addStroke(nodeId, transform, color, strokeWidth, vertices, indices, opacity = 1, blendMode = 'NORMAL') {
        this.commands.push({
            type: 'stroke',
            nodeId,
            transform,
            color,
            strokeWidth,
            vertices,
            indices,
            opacity,
            blendMode,
        });
    }
    /**
     * Add a text command.
     */
    addText(nodeId, transform, color, vertices, indices, atlasId, opacity = 1, blendMode = 'NORMAL') {
        this.commands.push({
            type: 'text',
            nodeId,
            transform,
            color,
            vertices,
            indices,
            atlasId,
            opacity,
            blendMode,
        });
    }
    /**
     * Add an image command.
     */
    addImage(nodeId, transform, textureId, vertices, opacity = 1, blendMode = 'NORMAL') {
        this.commands.push({
            type: 'image',
            nodeId,
            transform,
            textureId,
            vertices,
            opacity,
            blendMode,
        });
    }
    /**
     * Build batches from accumulated commands.
     */
    build() {
        // Group commands by type and other batch-breaking properties
        const batches = [];
        let currentBatch = [];
        let currentType = null;
        for (const cmd of this.commands) {
            // Check if we need to break the batch
            if (currentType !== cmd.type || this.shouldBreakBatch(currentBatch, cmd)) {
                if (currentBatch.length > 0) {
                    batches.push(this.createBatch(currentType, currentBatch));
                }
                currentBatch = [];
                currentType = cmd.type;
            }
            currentBatch.push(cmd);
        }
        // Finalize last batch
        if (currentBatch.length > 0 && currentType) {
            batches.push(this.createBatch(currentType, currentBatch));
        }
        return batches;
    }
    /**
     * Check if we should break the current batch.
     */
    shouldBreakBatch(current, next) {
        if (current.length === 0)
            return false;
        // Break on blend mode change
        const last = current[current.length - 1];
        if (last.blendMode !== next.blendMode)
            return true;
        // Break on texture change for text/image
        if (next.type === 'text') {
            const lastText = last;
            const nextText = next;
            if (lastText.atlasId !== nextText.atlasId)
                return true;
        }
        if (next.type === 'image') {
            const lastImage = last;
            const nextImage = next;
            if (lastImage.textureId !== nextImage.textureId)
                return true;
        }
        return false;
    }
    /**
     * Create a batch from commands.
     */
    createBatch(type, commands) {
        // Calculate total buffer sizes
        let totalVertices = 0;
        let totalIndices = 0;
        for (const cmd of commands) {
            if ('vertices' in cmd) {
                totalVertices += cmd.vertices.length;
            }
            if ('indices' in cmd) {
                totalIndices += cmd.indices.length;
            }
        }
        // Merge buffers
        const vertexBuffer = new Float32Array(totalVertices);
        const indexBuffer = new Uint16Array(totalIndices);
        let vertexOffset = 0;
        let indexOffset = 0;
        let baseVertex = 0;
        for (const cmd of commands) {
            if ('vertices' in cmd) {
                vertexBuffer.set(cmd.vertices, vertexOffset);
                const vertexCount = cmd.vertices.length / this.getVertexSize(type);
                vertexOffset += cmd.vertices.length;
                if ('indices' in cmd) {
                    // Adjust indices for merged buffer
                    for (let i = 0; i < cmd.indices.length; i++) {
                        indexBuffer[indexOffset + i] = cmd.indices[i] + baseVertex;
                    }
                    indexOffset += cmd.indices.length;
                }
                baseVertex += vertexCount;
            }
        }
        return {
            type,
            commands,
            vertexBuffer,
            indexBuffer,
            instanceCount: commands.length,
        };
    }
    /**
     * Get vertex size for a draw type.
     */
    getVertexSize(type) {
        switch (type) {
            case 'fill': return 2; // x, y
            case 'stroke': return 4; // x, y, nx, ny
            case 'text': return 4; // x, y, u, v
            case 'image': return 4; // x, y, u, v
        }
    }
    /**
     * Clear all commands.
     */
    clear() {
        this.commands = [];
    }
    /**
     * Get command count.
     */
    get commandCount() {
        return this.commands.length;
    }
}
/**
 * Create a batch builder.
 */
export function createBatchBuilder() {
    return new BatchBuilder();
}
//# sourceMappingURL=batch-generator.js.map