#!/usr/bin/env node
/*
 * SPDX-License-Identifier: Apache-2.0
 */
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import * as fs from 'fs-extra';
import yargs from 'yargs';
import path = require('path');
import { Logger } from './utils/logger';
import * as dag from 'dag-iterator';
import { Environment, shellcmd } from './utils/shell';
import { emptyDirSync } from 'fs-extra';

import { State, ContextCache, Context, Config } from './interfaces';

const log = Logger.getLogger('main');

let config: Config;
const ctxCache: ContextCache = {};

const logo = `
         ,   ,
          \\\\  \\\\
          ) \\\\ \\\\    I--
          )  )) ))  / * \\
          \\  || || / /^="
  ,__     _\\ \\\\ --/ /
 <  \\\\___/         '
     '===\\    ___, )
          \\  )___/\\\\
          / /      '"
          \\ \\
           '"
`;

const main = async (v2v: string, dryrun: boolean, asread: string[]) => {
    const _rootPath = path.resolve(v2v);
    log.info(logo);
    log.info(`dragon Started ==> "${_rootPath}"`);

    if (!fs.existsSync(_rootPath)) {
        throw new Error(`Directory "${_rootPath}" does not exist`);
    }

    const configFile = path.join(_rootPath, 'config.json');
    if (!fs.existsSync(configFile)) {
        throw new Error(`Config File "${configFile}" does not exist`);
    }

    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    config._rootPath = _rootPath;

    log.info(`Loaded config for "${config.description}"..`);


    // the run - one possible path through the nodes
    config._runIteration = "run001";

    log.info(`Clearing results..`);
    emptyDirSync(path.join(config._rootPath, config._runIteration, config.paths.results));
    //

    log.info('Handling contexts..');
    await contexts(config);

    Object.entries(config.states).forEach(([key, value]) => {
        value.id = key;
    });

    log.info('Creating the state graph..');
    // create the DAG
    const edges: dag.IEdge[] = [];
    const nodes: dag.INode<State>[] = Object.entries(config.states).map(([key, value]) => {
        if (value.followedby) {
            value.followedby.forEach((f) => {
                edges.push({ src: key, dst: f });
            });
        }
        return { name: key, data: value };
    });

    const stateOrderToExecute: State[] = [];
    dag.iterateDfs<State>(nodes, edges, (node) => {
        stateOrderToExecute.push(node);
    });

    log.info('Executing states in this order..');
    stateOrderToExecute.map((s) => s.id + ' ' + s.description).forEach((s) => log.info(s));

    // execute each state
    for (const state of stateOrderToExecute) {
        await executeState(state, dryrun || asread.includes(state.id));
    }
};

const executeState = async (s: State, dryrun: boolean) => {
    log.info(`--------------------------------------------------------------------------------`);
    log.info(`Executing state "${s.id}"`);
    if (s.execute.runner === 'cli') {
        const ctx = ctxCache[s.context];
        if (!ctx) {
            throw new Error(`Context ${s.context} not defined`);
        }

        const cmd = path.join(config._rootPath, config.paths.states, s.path, s.execute.path);

        log.info(`CONTEXT_PATH=${ctx}`);
        log.info(`${cmd}`);

        if (!dryrun) {
            try {
                const env: Environment = { CONTEXT_PATH: ctx, STATIC_CONFIG: s.staticconfig };
                const stdout: string[] = await shellcmd(cmd, env);
                const newCtx = path.join(config._rootPath, config._runIteration, config.paths.results, `${s.context}_post_${s.id}`);
                await fs.copy(ctx, newCtx);

                const logFile = path.join(config._rootPath, config._runIteration, config.paths.results, `${s.id}.log`);
                fs.writeFileSync(logFile, stdout.join('\n'));
            } catch (e) {
                console.log(e);
                log.error(`Failure in state "${s.id}"`);
                throw new Error(`Scenario Failed`);
            }
        } else {
            log.warn(`Bypassing execution..`);
        }
    } else {
        throw new Error(`Don't know how to execute "${s.execute.runner}"`);
    }
};

const contexts = async (config: Config) => {
    const contextRoot = path.join(config._rootPath, config._runIteration, config.paths.contexts);
    // if the directory doesn't exist create
     // if it does and clean is true remove contents

    config.contexts.forEach((ctx: Context) => {
        const ctxPath = path.join(contextRoot, ctx.id);
        ctxCache[ctx.id] = ctxPath;
        emptyDirSync(ctxPath);
    });
};

// quick argv

const argv = yargs
    .strict()
    .help()
    .option('configpath', {
        alias: 'c',
        required: true,
        type: 'string',
        describe: 'Path to the folder with the test configuration',
    })
    .option('asread', {
        require: false,
        type: 'array',
        describe: "Ids of states to be taken 'as read' - bypassed as per dryrun",
        default: [],
    })
    .option('dryrun', {
        alias: 'd',
        required: false,
        type: 'boolean',
        default: false,
    }).argv;

type Props = {
    configpath: string;
    dryrun: boolean;
    asread: string[];
};

main((argv as Props).configpath, (argv as Props).dryrun, (argv as Props).asread)
    .then()
    .catch((e) => {
        log.error(e);
        process.exit(1);
    });
