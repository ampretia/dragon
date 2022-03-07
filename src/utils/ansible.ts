/*
Copyright the Hyperledger Fabric contributors. All rights reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as path from 'path';

import { shellcmds } from './shell';
import * as fs from 'fs';
interface KeyValue {
    [key: string]: string;
}
export default class Ansible {
    public static async runPlaybook(playbook: string, args: KeyValue) {
        let playBookArgs = '';

        // If CLUSTER_TYPE is iks or ocp, we must use the credentials generated for the cluster
        // // otherwise, use the pipeline provided values
        // if ( !Ansible.containsEnvironmentVariableWithValue('CLUSTER_TYPE', 'ocp') && !Ansible.containsEnvironmentVariableWithValue('CLUSTER_TYPE', 'iks')) {
        //     args.api_key =  process.env.IBP_KEY;
        //     args.api_endpoint = process.env.IBP_ENDPOINT;
        // }

        if (Ansible.containsEnvironmentVariableWithValue('STAGING', '1')) {
            args.api_token_endpoint = 'https://iam.test.cloud.ibm.com/identity/token';
        }

        args.home_dir = path.resolve(process.env.PWD!, '..');

        args.org1_name = `Org1${process.env.SHORT_RUN_UID}`;
        args.org1_msp_id = `Org1${process.env.SHORT_RUN_UID}MSP`;
        args.ordering_org_name = `Ordering Org1 ${process.env.SHORT_RUN_UID}`;
        args.org1_ca_name = `Org1 ${process.env.SHORT_RUN_UID} CA`;
        args.org1_peer_name = `Org1 ${process.env.SHORT_RUN_UID} Peer`;
        args.ordering_service_msp = `Orderer${process.env.SHORT_RUN_UID}MSP`;
        args.ordering_service_name = `Orderer ${process.env.SHORT_RUN_UID} Service`;

        // write out the summary file for information and usage later
        fs.writeFileSync(path.join(process.env.ROOT_DIR!, `.ansible_vars.json`), JSON.stringify(args));

        playBookArgs = `--extra-vars '${JSON.stringify(args)}'`;

        // If DEBUG is present and "1", use -vvv flag
        const verbose = process.env.hasOwnProperty('DEBUG') && process.env.DEBUG === '1' ? '-vvv' : '';

        const commands = [`ansible-playbook ${verbose} ${playbook} ${playBookArgs}`];
        await shellcmds(commands);
    }

    public static containsEnvironmentVariableWithValue(variable: string, value: string): boolean {
        return process.env.hasOwnProperty(variable) && process.env[variable]!.localeCompare(value) === 0;
    }
}
