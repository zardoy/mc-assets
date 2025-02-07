import { z } from 'zod'
import { ItemDefinition, ItemDefinitionSchema, ItemProperties, ResolvedItemModel } from './types'
import { VersionedStore } from './versionedStore'
import { ItemDefinitionsStore } from './stores'
import { ItemsRenderer } from './itemsRenderer'

export interface ItemSelector {
    version: string
    name: string
    properties: ItemProperties
}

const formatDatePattern = (date: Date, pattern: string): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return pattern
        .replace('MM', month)
        .replace('dd', day)
}

const getPropertyValue = (property: string, source: string | undefined, target: string | undefined, properties: ItemProperties): number | undefined => {
    // Handle special cases based on source
    switch (source) {
        case 'daytime':
            return properties['minecraft:time'] as number
        case 'random':
            // For random source, we'll use a random value between 0 and 1
            return Math.random()
        default:
            // For regular properties or no source specified
            const value = properties[property]
            if (typeof value === 'number') return value
            return undefined
    }
}

const resolveModel = (
    model: z.infer<typeof ItemDefinitionSchema.shape.model>,
    properties: ItemProperties
): ResolvedItemModel => {
    switch (model.type) {
        case 'minecraft:model':
            return {
                model: model.model,
                ...(model.tints && { tints: model.tints })
            }

        case 'minecraft:empty':
            return {
                model: 'minecraft:builtin/empty'
            }

        case 'minecraft:select': {
            const contextValue = properties[model.property]
            let formattedValue = contextValue

            // Handle date pattern formatting
            if (model.pattern && (model.property === 'minecraft:local_time' || model.property === 'minecraft:date') && contextValue) {
                const date = contextValue as Date
                formattedValue = formatDatePattern(date, model.pattern)
            }

            // Find matching case
            const matchingCase = model.cases.find(c =>
                Array.isArray(c.when) ? c.when.some(w => w === formattedValue) : c.when === formattedValue
            )

            const selectedModel = matchingCase?.model ?? model.fallback
            if (!selectedModel) throw new Error(`No matching case for ${model.property}=${formattedValue}`)

            const resolvedModel = resolveModel(selectedModel, properties)
            return {
                ...resolvedModel,
                watchProperties: [
                    ...(resolvedModel.watchProperties || []),
                    {
                        property: model.property as keyof ItemProperties,
                        type: 'select',
                        currentValue: formattedValue
                    }
                ]
            }
        }

        case 'minecraft:range_dispatch': {
            const value = getPropertyValue(model.property, model.source, model.target, properties)
            if (typeof value !== 'number') {
                return resolveModel(model.fallback, properties)
            }

            const scaledValue = model.scale ? value * model.scale : value

            // Find the appropriate range entry
            const entry = model.entries
                .sort((a, b) => b.threshold - a.threshold)
                .find(e => scaledValue >= e.threshold)

            const selectedModel = entry?.model ?? model.fallback
            const resolvedModel = resolveModel(selectedModel, properties)

            return {
                ...resolvedModel,
                watchProperties: [
                    ...(resolvedModel.watchProperties || []),
                    {
                        property: model.property as keyof ItemProperties,
                        type: 'range',
                        currentValue: value,
                        source: model.source,
                        ...(model.target && { target: model.target })
                    }
                ]
            }
        }

        case 'minecraft:condition': {
            const value = properties[model.property]
            const selectedModel = value ? model.on_true : model.on_false
            const resolvedModel = resolveModel(selectedModel, properties)

            return {
                ...resolvedModel,
                watchProperties: [
                    ...(resolvedModel.watchProperties || []),
                    {
                        property: model.property as keyof ItemProperties,
                        type: 'condition',
                        currentValue: value
                    }
                ]
            }
        }

        case 'minecraft:composite': {
            // For composite models, we'll use the first resolvable model
            for (const subModel of model.models) {
                try {
                    return resolveModel(subModel, properties)
                } catch (e) {
                    // Try next model if this one fails
                    continue
                }
            }
            throw new Error('No resolvable model found in composite')
        }

        case 'minecraft:special': {
            // Special models like bundle/selected_item are handled by the renderer
            return {
                model: `minecraft:special`,
                special: model.model
            }
        }

        default: {
            // This should never happen as the type is discriminated union
            throw new Error(`Unknown model type: ${(model as any).type}`)
        }
    }
}

export const getItemDefinition = (
    store: ItemDefinitionsStore,
    selector: ItemSelector
): ResolvedItemModel | undefined => {
    const { version, name, properties } = selector

    // Convert milliseconds to ticks if provided
    if (properties.use_duration_ms !== undefined) {
        const ticks = Math.floor(properties.use_duration_ms / 50)
        properties['minecraft:use_duration'] = ticks
    }

    const definition = store.get(version, name)

    if (!definition) return undefined

    try {
        return resolveModel(definition.model, properties)
    } catch (e) {
        console.warn(`Error resolving model for ${name} in version ${version}:`, e)
        return undefined
    }
}

export const getItemDefinitionModelResolved = (
    store: ItemDefinitionsStore,
    selector: ItemSelector,
    itemsRenderer: ItemsRenderer
): (ResolvedItemModel & { modelResolved: any }) | undefined => {
    const definition = getItemDefinition(store, selector)
    if (!definition) return undefined
    let model = definition.model
    if (definition.model.startsWith('minecraft:builtin/') || definition.model === 'minecraft:special') {
        model = selector.name // fallback to what we can render ourlsef
    }
    return {
        ...definition,
        modelResolved: itemsRenderer.getItemTexture(model, {})
    }
}
