/*
 * SPDX-License-Identifier: Apache-2.0
 */
export interface Execution {
    runner: string;
    path: string;
}

export interface State {
    depends: string[];
    description: string;
    execute: Execution;
    path: string;
    id: string;
    context: string;
    followedby: string[];
    staticconfig: string;
}

export interface StateCollection {
    [key: string]: State;
}

export interface Context {
    id: string;
    path: string;
}

export interface Config {
    version: string;
    description: string;
    states: StateCollection;
    contexts: Context[];
    paths: Paths;
    _rootPath: string;
    _runIteration: string;
}

export interface Paths {
    states: string;
    contexts: string;
    results: string;
    configs: string;
}

export interface ContextCache {
    [key: string]: string;
}
