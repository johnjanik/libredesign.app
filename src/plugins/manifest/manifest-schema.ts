/**
 * Manifest Schema
 *
 * JSON Schema for plugin manifest validation.
 */

import type { PluginManifest } from '../types/plugin-manifest';

/**
 * JSON Schema for plugin manifest
 */
export const MANIFEST_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['schemaVersion', 'id', 'version', 'name', 'capabilities', 'limits', 'entry'],
  properties: {
    schemaVersion: {
      type: 'string',
      enum: ['1.0.0'],
      description: 'Manifest schema version',
    },
    id: {
      type: 'string',
      minLength: 3,
      maxLength: 100,
      description: 'Unique plugin identifier (reverse domain notation)',
    },
    version: {
      type: 'string',
      minLength: 5,
      maxLength: 50,
      description: 'Plugin version (semver)',
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Human-readable plugin name',
    },
    description: {
      type: 'string',
      maxLength: 500,
      description: 'Plugin description',
    },
    author: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 100 },
        email: { type: 'string', format: 'email' },
        url: { type: 'string', format: 'uri' },
      },
      required: ['name'],
    },
    homepage: {
      type: 'string',
      format: 'uri',
      description: 'Plugin homepage URL',
    },
    license: {
      type: 'string',
      maxLength: 50,
      description: 'SPDX license identifier',
    },
    keywords: {
      type: 'array',
      items: { type: 'string', maxLength: 30 },
      maxItems: 10,
      description: 'Search keywords',
    },
    icon: {
      type: 'string',
      maxLength: 200,
      description: 'Relative path to icon file',
    },
    capabilities: {
      type: 'object',
      properties: {
        read: {
          type: 'object',
          properties: {
            types: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'POLYGON',
                  'STAR', 'VECTOR', 'TEXT', 'IMAGE', 'COMPONENT',
                  'INSTANCE', 'LINE', '*',
                ],
              },
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['selection', 'current-page', 'current-document', 'all-documents'],
              },
            },
          },
          required: ['types', 'scopes'],
        },
        write: {
          type: 'object',
          properties: {
            types: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'POLYGON',
                  'STAR', 'VECTOR', 'TEXT', 'IMAGE', 'COMPONENT',
                  'INSTANCE', 'LINE', '*',
                ],
              },
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['selection', 'current-page', 'current-document', 'all-documents'],
              },
            },
          },
          required: ['types', 'scopes'],
        },
        ui: {
          type: 'object',
          properties: {
            types: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['panel', 'modal', 'context-menu', 'toast'],
              },
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['main', 'inspector', 'toolbar'],
              },
            },
          },
          required: ['types', 'scopes'],
        },
        network: {
          type: 'object',
          properties: {
            domains: {
              type: 'array',
              items: { type: 'string', maxLength: 200 },
              maxItems: 20,
            },
            methods: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              },
            },
          },
          required: ['domains', 'methods'],
        },
        clipboard: {
          type: 'boolean',
        },
        storage: {
          type: 'boolean',
        },
      },
    },
    limits: {
      type: 'object',
      properties: {
        memory: {
          type: 'string',
          pattern: '^\\d+(?:\\.\\d+)?\\s*(B|KB|MB|GB)$',
          description: 'Maximum memory (e.g., "64MB")',
        },
        executionTime: {
          type: 'string',
          pattern: '^\\d+(?:\\.\\d+)?\\s*(ms|s|m|h)$',
          description: 'Maximum execution time per tick (e.g., "50ms")',
        },
        storage: {
          type: 'string',
          pattern: '^\\d+(?:\\.\\d+)?\\s*(B|KB|MB|GB)$',
          description: 'Maximum storage quota (e.g., "10MB")',
        },
        apiCallsPerMinute: {
          type: 'integer',
          minimum: 1,
          maximum: 10000,
        },
        networkRequestsPerMinute: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
        },
      },
      required: ['memory', 'executionTime', 'storage'],
    },
    entry: {
      type: 'object',
      properties: {
        main: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Main entry point file',
        },
        ui: {
          type: 'string',
          maxLength: 200,
          description: 'UI entry point file (for iframe)',
        },
      },
      required: ['main'],
    },
    integrity: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        pattern: '^sha384-[A-Za-z0-9+/=]+$',
      },
      description: 'SHA-384 hashes of plugin files',
    },
    minimumDesignLibreVersion: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Minimum required DesignLibre version',
    },
    dependencies: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        pattern: '^\\d+\\.\\d+\\.\\d+$',
      },
      description: 'Plugin dependencies',
    },
  },
} as const;

/**
 * Manifest validation result
 */
export interface ManifestValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly manifest?: PluginManifest;
}

/**
 * Example manifest for reference
 */
export const EXAMPLE_MANIFEST: PluginManifest = {
  schemaVersion: '1.0.0',
  id: 'com.example.hello-world',
  version: '1.0.0',
  name: 'Hello World',
  description: 'A simple hello world plugin',
  author: {
    name: 'Example Author',
    email: 'author@example.com',
    url: 'https://example.com',
  },
  homepage: 'https://github.com/example/hello-world-plugin',
  license: 'MIT',
  keywords: ['hello', 'example', 'starter'],
  capabilities: {
    read: {
      types: ['*'],
      scopes: ['selection'],
    },
    ui: {
      types: ['panel', 'toast'],
      scopes: ['main'],
    },
  },
  limits: {
    memory: '64MB',
    executionTime: '50ms',
    storage: '10MB',
  },
  entry: {
    main: './dist/main.js',
    ui: './dist/ui.js',
  },
  integrity: {
    './dist/main.js': 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
    './dist/ui.js': 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
  },
};
