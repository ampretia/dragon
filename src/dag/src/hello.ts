/*
 * SPDX-License-Identifier: Apache-2.0
 */
import sourceMapSupport from 'source-map-support';
import { Navigable } from './Edge';
import Graph, { NodeVisitor } from './Graph';
import Node from './Node';
sourceMapSupport.install();


const n1 = new Node('start');
const n2 = new Node('opt1');
const n3 = new Node('opt2');
const n4 = new Node('mid');
const n5 = new Node('opt3');
const n6 = new Node('opt4');
const n7 = new Node('end');

const g = new Graph<string>();
g.addNodes([n1, n2, n3, n4, n5, n6, n7]);

g.link(n1, n2, Navigable.Navigable);
g.link(n1, n3, Navigable.Navigable);
g.link(n2, n4, Navigable.Navigable);
g.link(n3, n4, Navigable.Navigable);
g.link(n4, n5, Navigable.Navigable);
g.link(n4, n6, Navigable.Navigable);
g.link(n6, n7, Navigable.Navigable);
g.link(n5, n7, Navigable.Navigable);
console.log(g.toString());
console.log('\n');
g.flatten();


const visitor: NodeVisitor<string> = (node: Node<string>) => {
    console.log(`${node.toString()}-${node.getData()}`);
    return true;
};

g.visit(visitor);
