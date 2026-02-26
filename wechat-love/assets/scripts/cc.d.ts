// Cocos Creator 类型声明
declare module 'cc' {
    export class Component {
        protected node: Node;
        protected onLoad?(): void;
        protected start?(): void;
        protected update?(deltaTime: number): void;
    }

    export class Node {
        parent: Node | null;
        children: Node[];
        active: boolean;
        position: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
        setParent(parent: Node | null): void;
        setSiblingIndex(index: number): void;
        setPosition(x: number, y: number, z?: number): void;
        setScale(x: number, y: number, z?: number): void;
        on(event: string, callback: Function): void;
        off(event: string, callback?: Function): void;
        destroy(): void;
    }

    export class Sprite extends Component {}
    export class Label extends Component {}
    export class RichText extends Component {}
    export class Button extends Component { node: Node; }
    export class SpriteFrame {}
    export class AudioClip {}
    export class AudioSource extends Component {}
    export class Canvas extends Component {}
    
    export const director: any;
    export const screen: any;
    export const view: any;

    export type ClassDecorator = (target: Function) => Function | void;
    export type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;

    export function _decorator(target: any): any;
    export function ccclass(name?: string): ClassDecorator;
    export function property(type?: any): PropertyDecorator;

    export namespace tween {
        function target(node: Node): any;
    }

    export class Vec3 {
        constructor(x?: number, y?: number, z?: number);
    }
}
