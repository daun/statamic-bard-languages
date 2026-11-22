declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent;
    export default component;
}

declare module '@statamic/cms/vite-plugin' {
    import type { PluginOption } from 'vite';
    export default function statamic(options?: { vue?: object }): PluginOption[];
}
