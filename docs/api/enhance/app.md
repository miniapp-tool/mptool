# $App

## 配置

### onAwake

- 类型:

  ```ts
  function onAwake(time: number): void | Promise<void>;
  ```

- 参数:

  - `time`: 本次切入后台的时间，单位 ms

在小程序从后台唤醒时调用

## 注入

### 事件派发

事件派发相关，均为 [$Emitter](./emitter.md) 实例属性或方法

- `$on(type:string, handler: (event?:any) => void | Promise<void>): void`: 监听 `type` 事件

- `$emit(type:string, event?:any): void`: 同步触发 `type` 事件

- `$emitAsync(type:string, event?:any): Promise<void>`: 异步触发 `type` 事件并接受回调

- `$off(type:string, handler: (event?:any) => void | Promise<void>): Promise<void>`: 取消监听 `type` 的 `handler` 事件或全部事件 (当未传入 `handler`)

- `$all`: 事件名称到已注册处理函数的映射
