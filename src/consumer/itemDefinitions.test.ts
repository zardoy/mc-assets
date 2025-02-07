import { describe, it, expect } from 'vitest'
import { getItemDefinition } from './itemDefinitions'
import { VersionedStore } from './versionedStore'
import { ItemDefinition } from './types'
import { getLoadedItemDefinitionsStore } from './stores'
import fs from 'fs'

describe('itemDefinitions', () => {
    const itemsDefinitionsJson = JSON.parse(fs.readFileSync('./dist/itemDefinitions.json', 'utf8'))
    const store = getLoadedItemDefinitionsStore(itemsDefinitionsJson)

    const version = 'latest';
    describe('bow', () => {
        it('returns normal bow when not using', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'bow',
                properties: {
                    'minecraft:using_item': false
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/bow',
                watchProperties: [{
                    property: 'minecraft:using_item',
                    type: 'condition',
                    currentValue: false
                }]
            })
        })

        it('returns pulling_0 when just started using', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'bow',
                properties: {
                    'minecraft:using_item': true,
                    'minecraft:use_duration': 1
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/bow_pulling_0',
                watchProperties: [
                    {
                        property: 'minecraft:use_duration',
                        type: 'range',
                        currentValue: 1
                    },
                    {
                        property: 'minecraft:using_item',
                        type: 'condition',
                        currentValue: true
                    },
                ]
            })
        })

        it('returns pulling_1 at medium duration', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'bow',
                properties: {
                    'minecraft:using_item': true,
                    'minecraft:use_duration': 15 // 15 * 0.05 = 0.75 > 0.65
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/bow_pulling_1',
                watchProperties: [
                    {
                        property: 'minecraft:use_duration',
                        type: 'range',
                        currentValue: 15
                    },
                    {
                        property: 'minecraft:using_item',
                        type: 'condition',
                        currentValue: true
                    }
                ]
            })
        })

        it('returns pulling_2 at full duration', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'bow',
                properties: {
                    'minecraft:using_item': true,
                    'minecraft:use_duration': 20 // 20 * 0.05 = 1 > 0.9
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/bow_pulling_2',
                watchProperties: [
                    {
                        property: 'minecraft:use_duration',
                        type: 'range',
                        currentValue: 20
                    },
                    {
                        property: 'minecraft:using_item',
                        type: 'condition',
                        currentValue: true
                    }
                ]
            })
        })

        it('stays at pulling_2 above max duration', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'bow',
                properties: {
                    'minecraft:using_item': true,
                    use_duration_ms: 2000 // 40 ticks, well above max
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/bow_pulling_2',
                watchProperties: [
                    {
                        property: 'minecraft:use_duration',
                        type: 'range',
                        currentValue: 40
                    },
                    {
                        property: 'minecraft:using_item',
                        type: 'condition',
                        currentValue: true
                    }
                ]
            })
        })
    })

    describe('brown_bundle', () => {
        it('returns normal bundle in inventory when not selected', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'brown_bundle',
                properties: {
                    'minecraft:display_context': 'gui',
                    'minecraft:bundle/has_selected_item': false
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/brown_bundle',
                watchProperties: [
                    {
                        property: 'minecraft:bundle/has_selected_item',
                        type: 'condition',
                        currentValue: false
                    },
                    {
                        property: 'minecraft:display_context',
                        type: 'select',
                        currentValue: 'gui'
                    },
                ]
            })
        })
    })

    describe('chainmail_boots', () => {
        it('returns diamond trim model when diamond trim applied', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chainmail_boots',
                properties: {
                    'minecraft:trim_material': 'minecraft:diamond'
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/chainmail_boots_diamond_trim',
                watchProperties: [
                    {
                        property: 'minecraft:trim_material',
                        type: 'select',
                        currentValue: 'minecraft:diamond'
                    }
                ]
            })
        })

        it('returns base model when no trim', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chainmail_boots',
                properties: {}
            })

            expect(result).toEqual({
                model: 'minecraft:item/chainmail_boots',
                watchProperties: [
                    {
                        property: 'minecraft:trim_material',
                        type: 'select',
                        currentValue: undefined
                    }
                ]
            })
        })
    })

    describe('brush', () => {
        it('returns different brush models based on use cycle', () => {
            const testCases = [
                { cycle: 1, expected: 'minecraft:item/brush' },
                { cycle: 3, expected: 'minecraft:item/brush_brushing_0' },
                { cycle: 6, expected: 'minecraft:item/brush_brushing_1' },
                { cycle: 8, expected: 'minecraft:item/brush_brushing_2' }
            ]

            for (const { cycle, expected } of testCases) {
                const result = getItemDefinition(store, {
                    version: version,
                    name: 'brush',
                    properties: {
                        'minecraft:use_cycle': cycle
                    }
                })

                expect(result?.model).toBe(expected)
                expect(result?.watchProperties).toEqual([{
                    property: 'minecraft:use_cycle',
                    type: 'range',
                    currentValue: cycle
                }])
            }
        })
    })

    describe.todo('chest', () => {
        it('returns normal chest model outside Christmas', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chest',
                properties: {
                    'minecraft:date': new Date('2024-07-15') // Middle of the year
                }
            })

            expect(result?.model).toBe('minecraft:block/chest')
        })

        it('returns Christmas chest model during Christmas', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chest',
                properties: {
                    'minecraft:date': new Date('2024-12-25') // Christmas day
                }
            })

            expect(result?.model).toBe('minecraft:block/christmas_chest')
        })

        it('returns Christmas chest model on Christmas Eve', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chest',
                properties: {
                    'minecraft:date': new Date('2024-12-24') // Christmas Eve
                }
            })

            expect(result?.model).toBe('minecraft:block/christmas_chest')
        })

        it('returns Christmas chest model on Boxing Day', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chest',
                properties: {
                    'minecraft:date': new Date('2024-12-26') // Boxing Day
                }
            })

            expect(result?.model).toBe('minecraft:block/christmas_chest')
        })

        it('uses fallback model when no date provided', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'chest',
                properties: {}
            })

            expect(result?.model).toBe('minecraft:block/chest')
        })
    })

    describe('clock', () => {
        it('returns correct clock model based on time in overworld', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'clock',
                properties: {
                    'minecraft:time': 0.5, // Should be scaled by 64
                    'minecraft:context_dimension': 'minecraft:overworld'
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/clock_32',
                watchProperties: [
                    {
                        property: 'minecraft:time',
                        type: 'range',
                        currentValue: 0.5,
                        source: 'daytime'
                    },
                    {
                        property: 'minecraft:context_dimension',
                        type: 'select',
                        currentValue: 'minecraft:overworld'
                    }
                ]
            })
        })

        it('uses random time source outside overworld', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'clock',
                properties: {
                    'minecraft:time': 0.5,
                    'minecraft:context_dimension': 'minecraft:the_nether'
                }
            })

            expect(result?.watchProperties).toContainEqual({
                property: 'minecraft:time',
                type: 'range',
                currentValue: expect.any(Number),
                source: 'random'
            })
        })
    })

    describe('compass', () => {
        it('returns correct compass model for spawn point in overworld', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'compass',
                properties: {
                    'minecraft:compass': 16, // Should be scaled by 32
                    'minecraft:context_dimension': 'minecraft:overworld',
                    'minecraft:has_component': false
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/compass_16',
                watchProperties: [
                    {
                        property: 'minecraft:compass',
                        type: 'range',
                        currentValue: 16,
                        target: 'spawn'
                    },
                    {
                        property: 'minecraft:context_dimension',
                        type: 'select',
                        currentValue: 'minecraft:overworld'
                    },
                    {
                        property: 'minecraft:has_component',
                        type: 'condition',
                        currentValue: false
                    }
                ]
            })
        })

        it('returns correct compass model for lodestone', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'compass',
                properties: {
                    'minecraft:compass': 16,
                    'minecraft:has_component': true
                }
            })

            expect(result).toEqual({
                model: 'minecraft:item/compass_16',
                watchProperties: [
                    {
                        property: 'minecraft:compass',
                        type: 'range',
                        currentValue: 16,
                        target: 'lodestone'
                    },
                    {
                        property: 'minecraft:has_component',
                        type: 'condition',
                        currentValue: true
                    }
                ]
            })
        })

        it('uses none target outside overworld without lodestone', () => {
            const result = getItemDefinition(store, {
                version: version,
                name: 'compass',
                properties: {
                    'minecraft:compass': 16,
                    'minecraft:context_dimension': 'minecraft:the_nether',
                    'minecraft:has_component': false
                }
            })

            expect(result?.watchProperties).toContainEqual({
                property: 'minecraft:compass',
                type: 'range',
                currentValue: 16,
                target: 'none'
            })
        })
    })
})
