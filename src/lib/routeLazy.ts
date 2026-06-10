import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export function lazyNamed<
  const T extends Record<string, ComponentType>,
  K extends keyof T & string,
>(loader: () => Promise<T>, exportName: K): LazyExoticComponent<ComponentType> {
  return lazy(() =>
    loader().then((moduleExports) => {
      const Component = moduleExports[exportName] as ComponentType
      if (!Component) throw new Error(`Module does not export "${exportName}"`)
      return { default: Component }
    }),
  )
}
