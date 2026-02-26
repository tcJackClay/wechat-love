/**
 * 简单事件发射器 - 用于模块间通信
 * 替代Cocos的EventTarget，用于跨模块事件传递
 */

type EventCallback = (data?: any) => void;

export class EventEmitter {
    private _events: Map<string, EventCallback[]> = new Map();

    /**
     * 监听事件
     */
    on(event: string, callback: EventCallback): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push(callback);
    }

    /**
     * 监听一次
     */
    once(event: string, callback: EventCallback): void {
        const wrapper = (data?: any) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * 取消监听
     */
    off(event: string, callback?: EventCallback): void {
        if (!callback) {
            this._events.delete(event);
            return;
        }

        const callbacks = this._events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 发送事件
     */
    emit(event: string, data?: any): void {
        const callbacks = this._events.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }

    /**
     * 清空所有事件
     */
    clear(): void {
        this._events.clear();
    }
}
