import { test, expect } from 'vitest'

import { VersionedStore } from './consumer/versionedStore'

test('versioned store', () => {
    const store = new VersionedStore()
    store.push('1.19.2', 'test', 'data')
    store.push('1.19.1', 'test', 'data')
    store.push('1.18', 'test', 'data-new')
    store.push('1.18', 'test2', 'data-new')
    store.push('1.17', 'test', 'data-old')
    store.push('1.16', 'test2', 'data-new')

    expect(store.data).toMatchInlineSnapshot(`
      {
        "1.16": {
          "test2": "data-new",
        },
        "1.17": {
          "test": "data-old",
        },
        "1.18": {
          "test": "data-new",
        },
        "latest": {
          "test": "data",
          "test2": "data-new",
        },
      }
    `)

    expect(store.get('1.20', 'test')).toBe('data')
    expect(store.get('1.19', 'test')).toBe('data')
    expect(store.get('1.18', 'test')).toBe('data-new')
    expect(store.get('1.18', 'test', false)).toBe('data')
    expect(store.get('1.15', 'test')).toBe('data-old')
    expect(store.get('1.16', 'test')).toBe('data-old')
    expect(store.get('1.15', 'test2')).toBe('data-new')
    expect(store.get('1.16.2', 'test')).toBe('data-old')

    // strict versioned

    const store2 = new VersionedStore(true)
    store2.push('1.19.2', 'test', 'data')
    store2.push('1.19.1', 'test', 'data')
    store2.push('1.18', 'test', 'data-new')
    store2.push('1.18', 'test2', 'data-new')
    store2.push('1.17', 'test', 'data')

    expect(store2.data).toMatchInlineSnapshot(`
      {
        "1.17": {
          "test": "data",
        },
        "1.18": {
          "test": "data-new",
          "test2": "data-new",
        },
        "1.19.2": {
          "test": "data",
        },
      }
    `)

    expect(store.get('1.20', 'test')).toBe('data')
    expect(store.get('1.19', 'test')).toBe('data')
    expect(store.get('1.18', 'test')).toBe('data-new')
    expect(store.get('1.15', 'test')).toBe('data-old')
    expect(store.get('1.15', 'test2')).toBe('data-new')
})
