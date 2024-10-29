import { getRealms } from '../ops/RealmOps';
import Constants from '../shared/Constants';
import { State } from '../shared/State';

export type FRUtils = {
  applyNameCollisionPolicy(name: string): string;
  getRealmPath(realm: string): string;
  getCurrentRealmPath(): string;
  getCurrentRealmName(): string;
  getCurrentRealmManagedUser(): string;
  getRealmName(realm: string): string;
  getRealmUsingExportFormat(realm: string): string;
  /**
   * Gets the list of realms to be used for exports in special format.
   * e.g. if the realm is normally '/first/second', then it will return 'root-first-second'.
   */
  getRealmsForExport(): Promise<string[]>;
  /**
   * Helper that gets the normal realm name from the realm export format.
   * It reverses the format generated by getRealmsForExport.
   * e.g. if the realm is 'root-first-second', then it will return '/first/second'.
   * @param realm realm in export format
   */
  getRealmUsingExportFormat(realm: string): string;
  /**
   * Get host URL without path and query params
   * @param {string} url tenant URL with path and query params
   * @returns {string} AM host URL without path and query params
   */
  getHostUrl(url: string): string;
  /**
   * Get IDM base URL
   * @returns {string} IDM host URL without path and query params
   */
  getIdmBaseUrl(): string;

  // deprecated

  /**
   * Get host URL without path and query params
   * @param {string} url tenant URL with path and query params
   * @returns {string} AM host URL without path and query params
   * @deprecated since v2.1.2 use {@link FRUtils.getHostUrl | getHostUrl} instead
   * ```javascript
   * getHostUrl(url: string): string
   * ```
   * @group Deprecated
   */
  getHostBaseUrl(url: string): string;
};

export default (state: State): FRUtils => {
  return {
    applyNameCollisionPolicy(name: string): string {
      return applyNameCollisionPolicy(name);
    },
    getRealmsForExport(): Promise<string[]> {
      return getRealmsForExport({ state });
    },
    getRealmUsingExportFormat(realm: string): string {
      return getRealmUsingExportFormat(realm);
    },
    getRealmPath(realm: string): string {
      return getRealmPath(realm);
    },
    getCurrentRealmPath(): string {
      return getCurrentRealmPath(state);
    },
    getCurrentRealmName(): string {
      return getCurrentRealmName(state);
    },
    getCurrentRealmManagedUser(): string {
      return getCurrentRealmManagedUser({ state });
    },
    getRealmName(realm: string): string {
      return getRealmName(realm);
    },
    getHostUrl(url: string): string {
      return getHostOnlyUrl(url);
    },
    getIdmBaseUrl(): string {
      return getIdmBaseUrl(state);
    },
    // deprecated

    getHostBaseUrl(url: string): string {
      return getHostOnlyUrl(url);
    },
  };
};

/**
 * Get new name when names collide
 * @param {string} name to apply policy to
 * @returns {string} new name according to policy
 */
export function applyNameCollisionPolicy(name: string): string {
  const capturingRegex = /(.* - imported) \(([0-9]+)\)/;
  const found = name.match(capturingRegex);
  if (found && found.length > 0 && found.length === 3) {
    // already renamed one or more times
    // return the next number
    return `${found[1]} (${parseInt(found[2], 10) + 1})`;
  }
  // first time
  return `${name} - imported (1)`;
}

/**
 * Gets the list of realms to be used for exports in special format.
 * e.g. if the realm is normally '/first/second', then it will return 'root-first-second'.
 */
export async function getRealmsForExport({
  state,
}: {
  state: State;
}): Promise<string[]> {
  return (await getRealms({ state })).map((r) =>
    !r.name || r.name === '/' || !r.parentPath
      ? 'root'
      : `root${r.parentPath.replace('/', '-')}${
          r.parentPath !== '/' ? '-' : ''
        }${r.name}`
  );
}

/**
 * Helper that gets the normal realm name from the realm export format.
 * It reverses the format generated by getRealmsForExport.
 * e.g. if the realm is 'root-first-second', then it will return '/first/second'.
 * @param realm realm in export format
 */
export function getRealmUsingExportFormat(realm: string): string {
  if (realm === 'root') {
    return '/';
  }
  return realm.replace('root-', '/').replaceAll('-', '/');
}

/**
 * Helper function to get the config path required for the API call considering if the request
 * should obtain the realm config or the global config of the service in question
 * @param {boolean} globalConfig true if the global service is the target of the operation, false otherwise.
 * @returns {string} The config path to be used for the request
 */
export function getConfigPath(globalConfig: boolean): string {
  if (globalConfig) return 'global-config';
  return 'realm-config';
}

/**
 * Helper function to get the realm path required for the API call considering if the request
 * should obtain the realm config or the global config of the service in question
 * @param {boolean} globalConfig true if the global service is the target of the operation, false otherwise.
 * @returns {string} The realm path to be used for the request
 */
export function getRealmPathGlobal(
  globalConfig: boolean,
  state: State
): string {
  if (globalConfig) return '';
  return getCurrentRealmPath(state);
}

/**
 * Get realm path
 * @param {string} realm realm
 * @returns {string} a CREST-compliant realm path, e.g. /realms/root/realms/alpha
 */
export function getRealmPath(realm: string): string {
  if (!realm) realm = '/';
  if (realm.startsWith('/')) {
    realm = realm.substring(1);
  }
  const elements = ['root'].concat(
    realm.split('/').filter((element) => element !== '')
  );
  const realmPath = `/realms/${elements.join('/realms/')}`;
  return realmPath;
}

/**
 * Get current realm path
 * @returns {string} a CREST-compliant realm path, e.g. /realms/root/realms/alpha
 */
export function getCurrentRealmPath(state: State): string {
  return getRealmPath(state.getRealm());
}

/**
 * Get current realm name
 * @returns {string} name of the current realm. /alpha -> alpha
 */
export function getCurrentRealmName(state: State): string {
  const realm = state.getRealm();
  const components = realm.split('/');
  let realmName = '/';
  if (components.length > 0 && realmName !== realm) {
    realmName = components[components.length - 1];
  }
  return realmName;
}

/**
 * Get the name of the managed user object for the current realm
 * @returns {string} the name of the managed user object for the current realm
 */
export function getCurrentRealmManagedUser({
  state,
}: {
  state: State;
}): string {
  let realmManagedUser = 'user';
  if (state.getDeploymentType() === Constants.CLOUD_DEPLOYMENT_TYPE_KEY) {
    realmManagedUser = `${getCurrentRealmName(state)}_user`;
  }
  return realmManagedUser;
}

/**
 * Get current realm name
 * @param {string} realm realm
 * @returns {string} name of the realm. /alpha -> alpha
 */
export function getRealmName(realm: string): string {
  const components = realm.split('/');
  let realmName = '/';
  if (components.length > 0 && realmName !== realm) {
    realmName = components[components.length - 1];
  }
  return realmName;
}

/**
 * Get host-only URL without path and query params
 * @param {string} url URL with path and query params
 * @returns {string} AM host URL without path and query params
 */
export function getHostOnlyUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.host}`;
}

/**
 * Get IDM base URL
 * @param {State} state State object
 * @returns {string} IDM host URL without path and query params
 */
export function getIdmBaseUrl(state: State): string {
  if (state.getIdmHost()) {
    return state.getIdmHost();
  }
  return `${getHostOnlyUrl(state.getHost())}/openidm`;
}
