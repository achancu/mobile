import _ from "lodash";

export const HiddenProperty = "valueChanged";

/*
function debugObservers(observers) {
    return _(observers)
        .map((v, k) => {
            return [k, v.length];
        })
        .fromPairs()
        .value();
}
*/

class Observable {
    _observers: any;

    constructor() {
        this._observers = {};
    }

    on(eventNames, callback, thisArg: any = null) {
        return this.addEventListener(eventNames, callback, thisArg);
    }

    once(event, callback, thisArg: any = null) {
        const list = this._getEventList(event, true);
        list.push({ callback: callback, thisArg: thisArg, once: true });
    }

    off(eventNames, callback, thisArg: any = null) {
        return this.removeEventListener(eventNames, callback, thisArg);
    }

    addEventListener(eventNames, callback, thisArg: any = null) {
        if (typeof eventNames !== "string") {
            throw new TypeError("Events name(s) must be string.");
        }
        if (typeof callback !== "function") {
            throw new TypeError("callback must be function.");
        }
        // console.log(this.constructor.name, "addEventListener", eventNames);
        var events = eventNames.split(",");
        for (var i = 0, l = events.length; i < l; i++) {
            var event_1 = events[i].trim();
            var list = this._getEventList(event_1, true);
            list.push({
                callback: callback,
                thisArg: thisArg,
            });
        }
        // console.log(this.constructor.name, "addEventListener", eventNames, debugObservers(this._observers));
    }

    removeEventListener(eventNames, callback, thisArg: any = null) {
        if (typeof eventNames !== "string") {
            throw new TypeError("Events name(s) must be string.");
        }
        if (callback && typeof callback !== "function") {
            throw new TypeError("callback must be function.");
        }
        // console.log(this.constructor.name, "removeEventListener", eventNames, debugObservers(this._observers));
        const events = eventNames.split(",");
        for (let i = 0, l = events.length; i < l; i++) {
            const event_2 = events[i].trim();
            if (callback) {
                const list = this._getEventList(event_2, false);
                if (list) {
                    const index_1 = this._indexOfListener(list, callback, thisArg);
                    if (index_1 >= 0) {
                        list.splice(index_1, 1);
                    }
                    if (list.length === 0) {
                        delete this._observers[event_2];
                    }
                }
            } else {
                this._observers[event_2] = undefined;
                delete this._observers[event_2];
            }
        }
        // console.log(this.constructor.name, "removeEventListener", eventNames, debugObservers(this._observers));
    }

    notify(data) {
        const values: Promise<any>[] = [];
        const observers = this._observers[data.eventName];
        if (!observers) {
            return Promise.all(values);
        }

        // console.log(this.constructor.name, "notify", debugObservers(this._observers));
        for (let i = observers.length - 1; i >= 0; i--) {
            var entry = observers[i];
            if (entry.once) {
                observers.splice(i, 1);
            }
            if (entry.thisArg) {
                const rv = entry.callback.apply(entry.thisArg, [data]);
                values.push(Promise.resolve(rv));
            } else {
                const rv = entry.callback(data);
                values.push(Promise.resolve(rv));
            }
        }

        return Promise.all(values);
    }

    notifyPropertyChange(name, value, oldValue: any = null) {
        return this.notify(this._createPropertyChangeData(name, value, oldValue));
    }

    _createPropertyChangeData(propertyName, value, oldValue) {
        return { eventName: Observable.propertyChangeEvent, object: this, propertyName: propertyName, value: value, oldValue: oldValue };
    }

    _emit(eventNames) {
        var events = eventNames.split(",");
        for (var i = 0, l = events.length; i < l; i++) {
            var event_3 = events[i].trim();
            this.notify({ eventName: event_3, object: this });
        }
    }

    _getEventList(eventName, createIfNeeded) {
        if (!eventName) {
            throw new TypeError("EventName must be valid string.");
        }
        var list = this._observers[eventName];
        if (!list && createIfNeeded) {
            list = [];
            this._observers[eventName] = list;
        }
        return list;
    }

    _indexOfListener(list, callback, thisArg) {
        for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            if (thisArg) {
                if (entry.callback === callback && entry.thisArg === thisArg) {
                    return i;
                }
            } else {
                if (entry.callback === callback) {
                    return i;
                }
            }
        }
        return -1;
    }

    static propertyChangeEvent: string = "propertyChange";
}

export class BetterObservable extends Observable {
    _hasValue: boolean;
    _value: any;
    _counter: number;
    _listeners: any;

    constructor() {
        super();
        this._hasValue = false;
        this._value = null;
        this._counter = 0;
        this._listeners = {};
    }

    subscribe(receiver) {
        if (!this._hasValue) {
            // console.log(this.constructor.name, "Rx, subscribe, no value, refreshing", this._counter);
            this.refresh();
        } else {
            // console.log(this.constructor.name, "Rx, subscribe, immediate value", this._counter);
            receiver(this._value);
        }

        const listener = data => {
            switch (data.propertyName.toString()) {
                case HiddenProperty: {
                    receiver(data.value);
                    break;
                }
            }
        };

        this._listeners[receiver] = listener;

        this.addEventListener(Observable.propertyChangeEvent, listener, null);

        return {
            remove: () => {
                delete this._listeners[receiver];
                // console.log(this.constructor.name, "Rx, removing", this._counter);
                this.removeEventListener(Observable.propertyChangeEvent, listener, null);
            },
        };
    }

    unsubscribe(receiver) {
        const listener = this._listeners[receiver];
        // console.log(this.constructor.name, "Rx, removing", this._counter, listener);
        this.removeEventListener(Observable.propertyChangeEvent, listener, null);
    }

    publish(value) {
        this._value = value;
        this._hasValue = true;
        this._counter++;
        // console.log(this.constructor.name, "Rx, publishing new value", this._counter);
        return this.notifyPropertyChange(HiddenProperty, value);
    }

    refresh() {
        return this.getValue()
            .then(value => {
                if (value != null) {
                    return this.publish(value);
                }
                return value;
            })
            .catch(error => {
                console.log(this.constructor.name, "error", error, error ? error.stack : null);
            });
    }

    getValue() {
        return Promise.resolve(null);
    }
}

export function every(time: number, value: any = null): Observable {
    const observable = new Observable();
    observable.notifyPropertyChange(HiddenProperty, value);
    setInterval(() => {
        observable.notifyPropertyChange(HiddenProperty, value);
    }, time);
    return observable;
}
