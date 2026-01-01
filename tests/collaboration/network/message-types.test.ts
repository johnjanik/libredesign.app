/**
 * Message types tests
 */

import { describe, it, expect } from 'vitest';
import {
  serializeMessage,
  deserializeMessage,
  createHelloMessage,
  createOperationMessage,
  createPresenceMessage,
  createSyncRequestMessage,
  createErrorMessage,
  type HelloMessage,
  type OperationMessage,
  type PresenceMessage,
  type SyncRequestMessage,
  type ErrorMessage,
} from '@collaboration/network/message-types';
import { createTimestamp, type InsertNodeOperation } from '@collaboration/operations/operation-types';
import type { NodeId } from '@core/types/common';

describe('Message serialization', () => {
  describe('serializeMessage', () => {
    it('serializes a message to JSON string', () => {
      const message = createHelloMessage('client-1', 'doc-1', 'Alice');

      const serialized = serializeMessage(message);

      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('client-1');
      expect(serialized).toContain('doc-1');
    });

    it('preserves all message properties', () => {
      const message = createHelloMessage('client-1', 'doc-1', 'Alice', '2.0.0');

      const serialized = serializeMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('HELLO');
      expect(parsed.clientId).toBe('client-1');
      expect(parsed.documentId).toBe('doc-1');
      expect(parsed.userName).toBe('Alice');
      expect(parsed.version).toBe('2.0.0');
    });
  });

  describe('deserializeMessage', () => {
    it('deserializes a JSON string to message', () => {
      const original = createHelloMessage('client-1', 'doc-1', 'Alice');
      const serialized = serializeMessage(original);

      const message = deserializeMessage(serialized) as HelloMessage;

      expect(message.type).toBe('HELLO');
      expect(message.clientId).toBe('client-1');
    });

    it('throws on invalid JSON', () => {
      expect(() => deserializeMessage('not valid json')).toThrow();
    });
  });

  describe('roundtrip', () => {
    it('preserves message through serialize/deserialize', () => {
      const original = createHelloMessage('client-1', 'doc-1', 'Alice');

      const roundtripped = deserializeMessage(serializeMessage(original));

      expect(roundtripped).toEqual(original);
    });
  });
});

describe('Message creation helpers', () => {
  describe('createHelloMessage', () => {
    it('creates a HELLO message with required fields', () => {
      const message = createHelloMessage('client-1', 'doc-1', 'Alice');

      expect(message.type).toBe('HELLO');
      expect(message.clientId).toBe('client-1');
      expect(message.documentId).toBe('doc-1');
      expect(message.userName).toBe('Alice');
      expect(message.version).toBe('1.0.0'); // default
    });

    it('allows custom version', () => {
      const message = createHelloMessage('client-1', 'doc-1', 'Alice', '2.0.0');

      expect(message.version).toBe('2.0.0');
    });
  });

  describe('createOperationMessage', () => {
    it('creates an OPERATION message', () => {
      const operation: InsertNodeOperation = {
        id: 'op-1',
        type: 'INSERT_NODE',
        timestamp: createTimestamp(1, 'client-1'),
        nodeId: 'node-1' as NodeId,
        nodeType: 'FRAME',
        parentId: 'parent-1' as NodeId,
        fractionalIndex: 'a',
        data: { name: 'Test' },
      };

      const message = createOperationMessage(operation);

      expect(message.type).toBe('OPERATION');
      expect(message.operation).toBe(operation);
    });
  });

  describe('createPresenceMessage', () => {
    it('creates a PRESENCE message', () => {
      const presence = {
        cursor: { x: 100, y: 200 },
        isActive: true,
      };

      const message = createPresenceMessage('client-1', presence);

      expect(message.type).toBe('PRESENCE');
      expect(message.clientId).toBe('client-1');
      expect(message.presence).toEqual(presence);
    });

    it('accepts partial presence data', () => {
      const message = createPresenceMessage('client-1', { cursor: null });

      expect(message.presence.cursor).toBeNull();
    });
  });

  describe('createSyncRequestMessage', () => {
    it('creates a SYNC_REQUEST message with timestamp', () => {
      const since = createTimestamp(10, 'client-1');

      const message = createSyncRequestMessage(since);

      expect(message.type).toBe('SYNC_REQUEST');
      expect(message.since).toEqual(since);
    });

    it('allows null timestamp for initial sync', () => {
      const message = createSyncRequestMessage(null);

      expect(message.type).toBe('SYNC_REQUEST');
      expect(message.since).toBeNull();
    });
  });

  describe('createErrorMessage', () => {
    it('creates an ERROR message', () => {
      const message = createErrorMessage('UNAUTHORIZED', 'Not authorized');

      expect(message.type).toBe('ERROR');
      expect(message.code).toBe('UNAUTHORIZED');
      expect(message.message).toBe('Not authorized');
    });

    it('includes optional details', () => {
      const details = { missingPermission: 'write' };
      const message = createErrorMessage('UNAUTHORIZED', 'Not authorized', details);

      expect(message.details).toEqual(details);
    });

    it('handles all error codes', () => {
      const codes = [
        'INVALID_MESSAGE',
        'DOCUMENT_NOT_FOUND',
        'UNAUTHORIZED',
        'RATE_LIMITED',
        'INTERNAL_ERROR',
      ] as const;

      for (const code of codes) {
        const message = createErrorMessage(code, 'Test');
        expect(message.code).toBe(code);
      }
    });
  });
});

describe('Message types', () => {
  it('HELLO message has correct structure', () => {
    const message: HelloMessage = {
      type: 'HELLO',
      clientId: 'client-1',
      documentId: 'doc-1',
      userName: 'Alice',
      version: '1.0.0',
    };

    expect(message.type).toBe('HELLO');
  });

  it('OPERATION message has correct structure', () => {
    const message: OperationMessage = {
      type: 'OPERATION',
      operation: {
        id: 'op-1',
        type: 'DELETE_NODE',
        timestamp: createTimestamp(1, 'client-1'),
        nodeId: 'node-1' as NodeId,
      },
    };

    expect(message.type).toBe('OPERATION');
  });

  it('PRESENCE message has correct structure', () => {
    const message: PresenceMessage = {
      type: 'PRESENCE',
      clientId: 'client-1',
      presence: {
        cursor: { x: 0, y: 0 },
        isActive: true,
      },
    };

    expect(message.type).toBe('PRESENCE');
  });

  it('SYNC_REQUEST message has correct structure', () => {
    const message: SyncRequestMessage = {
      type: 'SYNC_REQUEST',
      since: null,
    };

    expect(message.type).toBe('SYNC_REQUEST');
  });

  it('ERROR message has correct structure', () => {
    const message: ErrorMessage = {
      type: 'ERROR',
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    };

    expect(message.type).toBe('ERROR');
  });
});
