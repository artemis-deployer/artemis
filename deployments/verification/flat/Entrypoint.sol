pragma solidity ^0.8.20;

// ---- node_modules/@openzeppelin/contracts/access/IAccessControl.sol ----
// SPDX-License-Identifier: MIT

// OpenZeppelin Contracts (last updated v5.1.0) (access/IAccessControl.sol)



/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted signaling this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (proxy/utils/Initializable.sol)



/**
 * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
 * behind a proxy. Since proxied contracts do not make use of a constructor, it's common to move constructor logic to an
 * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
 * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
 *
 * The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
 * reused. This mechanism prevents re-execution of each "step" but allows the creation of new initialization steps in
 * case an upgrade adds a module that needs to be initialized.
 *
 * For example:
 *
 * [.hljs-theme-light.nopadding]
 * ```solidity
 * contract MyToken is ERC20Upgradeable {
 *     function initialize() initializer public {
 *         __ERC20_init("MyToken", "MTK");
 *     }
 * }
 *
 * contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
 *     function initializeV2() reinitializer(2) public {
 *         __ERC20Permit_init("MyToken");
 *     }
 * }
 * ```
 *
 * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
 * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
 *
 * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
 * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
 *
 * [CAUTION]
 * ====
 * Avoid leaving a contract uninitialized.
 *
 * An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
 * contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
 * the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:
 *
 * [.hljs-theme-light.nopadding]
 * ```
 * /// @custom:oz-upgrades-unsafe-allow constructor
 * constructor() {
 *     _disableInitializers();
 * }
 * ```
 * ====
 */
abstract contract Initializable {
    /**
     * @dev Storage of the initializable contract.
     *
     * It's implemented on a custom ERC-7201 namespace to reduce the risk of storage collisions
     * when using with upgradeable contracts.
     *
     * @custom:storage-location erc7201:openzeppelin.storage.Initializable
     */
    struct InitializableStorage {
        /**
         * @dev Indicates that the contract has been initialized.
         */
        uint64 _initialized;
        /**
         * @dev Indicates that the contract is in the process of being initialized.
         */
        bool _initializing;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    /**
     * @dev The contract is already initialized.
     */
    error InvalidInitialization();

    /**
     * @dev The contract is not initializing.
     */
    error NotInitializing();

    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Initialized(uint64 version);

    /**
     * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
     * `onlyInitializing` functions can be used to initialize parent contracts.
     *
     * Similar to `reinitializer(1)`, except that in the context of a constructor an `initializer` may be invoked any
     * number of times. This behavior in the constructor can be useful during testing and is not expected to be used in
     * production.
     *
     * Emits an {Initialized} event.
     */
    modifier initializer() {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        // Cache values to avoid duplicated sloads
        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        // Allowed calls:
        // - initialSetup: the contract is not in the initializing state and no previous version was
        //                 initialized
        // - construction: the contract is initialized at version 1 (no reininitialization) and the
        //                 current contract is just being deployed
        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) {
            revert InvalidInitialization();
        }
        $._initialized = 1;
        if (isTopLevelCall) {
            $._initializing = true;
        }
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

    /**
     * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
     * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
     * used to initialize parent contracts.
     *
     * A reinitializer may be used after the original initialization step. This is essential to configure modules that
     * are added through upgrades and that require initialization.
     *
     * When `version` is 1, this modifier is similar to `initializer`, except that functions marked with `reinitializer`
     * cannot be nested. If one is invoked in the context of another, execution will revert.
     *
     * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
     * a contract, executing them in the right order is up to the developer or operator.
     *
     * WARNING: Setting the version to 2**64 - 1 will prevent any future reinitialization.
     *
     * Emits an {Initialized} event.
     */
    modifier reinitializer(uint64 version) {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing || $._initialized >= version) {
            revert InvalidInitialization();
        }
        $._initialized = version;
        $._initializing = true;
        _;
        $._initializing = false;
        emit Initialized(version);
    }

    /**
     * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
     * {initializer} and {reinitializer} modifiers, directly or indirectly.
     */
    modifier onlyInitializing() {
        _checkInitializing();
        _;
    }

    /**
     * @dev Reverts if the contract is not in an initializing state. See {onlyInitializing}.
     */
    function _checkInitializing() internal view virtual {
        if (!_isInitializing()) {
            revert NotInitializing();
        }
    }

    /**
     * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
     * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
     * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
     * through proxies.
     *
     * Emits an {Initialized} event the first time it is successfully executed.
     */
    function _disableInitializers() internal virtual {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing) {
            revert InvalidInitialization();
        }
        if ($._initialized != type(uint64).max) {
            $._initialized = type(uint64).max;
            emit Initialized(type(uint64).max);
        }
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function _getInitializedVersion() internal view returns (uint64) {
        return _getInitializableStorage()._initialized;
    }

    /**
     * @dev Returns `true` if the contract is currently initializing. See {onlyInitializing}.
     */
    function _isInitializing() internal view returns (bool) {
        return _getInitializableStorage()._initializing;
    }

    /**
     * @dev Returns a pointer to the storage namespace.
     */
    // solhint-disable-next-line var-name-mixedcase
    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        assembly {
            $.slot := INITIALIZABLE_STORAGE
        }
    }
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol ----
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)




/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal onlyInitializing {
    }

    function __Context_init_unchained() internal onlyInitializing {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// ---- node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)



/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/ERC165.sol)






/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165Upgradeable is Initializable, IERC165 {
    function __ERC165_init() internal onlyInitializing {
    }

    function __ERC165_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (access/AccessControl.sol)








/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControlUpgradeable is Initializable, ContextUpgradeable, IAccessControl, ERC165Upgradeable {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;


    /// @custom:storage-location erc7201:openzeppelin.storage.AccessControl
    struct AccessControlStorage {
        mapping(bytes32 role => RoleData) _roles;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.AccessControl")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant AccessControlStorageLocation = 0x02dd7bc7dec4dceedda775e58dd541e08a116c6c53815c0bd028192f7b626800;

    function _getAccessControlStorage() private pure returns (AccessControlStorage storage $) {
        assembly {
            $.slot := AccessControlStorageLocation
        }
    }

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function __AccessControl_init() internal onlyInitializing {
    }

    function __AccessControl_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $._roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $._roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        AccessControlStorage storage $ = _getAccessControlStorage();
        bytes32 previousAdminRole = getRoleAdmin(role);
        $._roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if (!hasRole(role, account)) {
            $._roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` to `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if (hasRole(role, account)) {
            $._roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}

// ---- node_modules/@openzeppelin/contracts/interfaces/draft-IERC1822.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/draft-IERC1822.sol)



/**
 * @dev ERC-1822: Universal Upgradeable Proxy Standard (UUPS) documents a method for upgradeability through a simplified
 * proxy whose upgrades are fully controlled by the current implementation.
 */
interface IERC1822Proxiable {
    /**
     * @dev Returns the storage slot that the proxiable contract assumes is being used to store the implementation
     * address.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy.
     */
    function proxiableUUID() external view returns (bytes32);
}

// ---- node_modules/@openzeppelin/contracts/proxy/beacon/IBeacon.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (proxy/beacon/IBeacon.sol)



/**
 * @dev This is the interface that {BeaconProxy} expects of its beacon.
 */
interface IBeacon {
    /**
     * @dev Must return an address that can be used as a delegate call target.
     *
     * {UpgradeableBeacon} will check that this address is a contract.
     */
    function implementation() external view returns (address);
}

// ---- node_modules/@openzeppelin/contracts/interfaces/IERC1967.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC1967.sol)



/**
 * @dev ERC-1967: Proxy Storage Slots. This interface contains the events defined in the ERC.
 */
interface IERC1967 {
    /**
     * @dev Emitted when the implementation is upgraded.
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Emitted when the admin account has changed.
     */
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @dev Emitted when the beacon is changed.
     */
    event BeaconUpgraded(address indexed beacon);
}

// ---- node_modules/@openzeppelin/contracts/utils/Errors.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Errors.sol)



/**
 * @dev Collection of common custom errors used in multiple contracts
 *
 * IMPORTANT: Backwards compatibility is not guaranteed in future versions of the library.
 * It is recommended to avoid relying on the error API for critical functionality.
 *
 * _Available since v5.1._
 */
library Errors {
    /**
     * @dev The ETH balance of the account is not enough to perform the operation.
     */
    error InsufficientBalance(uint256 balance, uint256 needed);

    /**
     * @dev A call to an address target failed. The target may have reverted.
     */
    error FailedCall();

    /**
     * @dev The deployment failed.
     */
    error FailedDeployment();

    /**
     * @dev A necessary precompile is missing.
     */
    error MissingPrecompile(address);
}

// ---- node_modules/@openzeppelin/contracts/utils/Address.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Address.sol)





/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev There's no code at `target` (it is not a contract).
     */
    error AddressEmptyCode(address target);

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.8.20/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert Errors.InsufficientBalance(address(this).balance, amount);
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert Errors.FailedCall();
        }
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason or custom error, it is bubbled
     * up by this function (like regular Solidity function calls). However, if
     * the call reverted with no returned reason, this function reverts with a
     * {Errors.FailedCall} error.
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Tool to verify that a low level call to smart-contract was successful, and reverts if the target
     * was not a contract or bubbling up the revert reason (falling back to {Errors.FailedCall}) in case
     * of an unsuccessful call.
     */
    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            // only check if target is a contract if the call was successful and the return data is empty
            // otherwise we already know that it was a contract
            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    /**
     * @dev Tool to verify that a low level call was successful, and reverts if it wasn't, either by bubbling the
     * revert reason or with a default {Errors.FailedCall} error.
     */
    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            return returndata;
        }
    }

    /**
     * @dev Reverts with returndata if present. Otherwise reverts with {Errors.FailedCall}.
     */
    function _revert(bytes memory returndata) private pure {
        // Look for revert reason and bubble it up if present
        if (returndata.length > 0) {
            // The easiest way to bubble the revert reason is using memory via assembly
            assembly ("memory-safe") {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert Errors.FailedCall();
        }
    }
}

// ---- node_modules/@openzeppelin/contracts/utils/StorageSlot.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.



/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// ---- node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (proxy/ERC1967/ERC1967Utils.sol)








/**
 * @dev This library provides getters and event emitting update functions for
 * https://eips.ethereum.org/EIPS/eip-1967[ERC-1967] slots.
 */
library ERC1967Utils {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @dev The `implementation` of the proxy is invalid.
     */
    error ERC1967InvalidImplementation(address implementation);

    /**
     * @dev The `admin` of the proxy is invalid.
     */
    error ERC1967InvalidAdmin(address admin);

    /**
     * @dev The `beacon` of the proxy is invalid.
     */
    error ERC1967InvalidBeacon(address beacon);

    /**
     * @dev An upgrade function sees `msg.value > 0` that may be lost.
     */
    error ERC1967NonPayable();

    /**
     * @dev Returns the current implementation address.
     */
    function getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 implementation slot.
     */
    function _setImplementation(address newImplementation) private {
        if (newImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(newImplementation);
        }
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    /**
     * @dev Performs implementation upgrade with additional setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _setImplementation(newImplementation);
        emit IERC1967.Upgraded(newImplementation);

        if (data.length > 0) {
            Address.functionDelegateCall(newImplementation, data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /**
     * @dev Returns the current admin.
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by ERC-1967) using
     * the https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
     */
    function getAdmin() internal view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 admin slot.
     */
    function _setAdmin(address newAdmin) private {
        if (newAdmin == address(0)) {
            revert ERC1967InvalidAdmin(address(0));
        }
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }

    /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {IERC1967-AdminChanged} event.
     */
    function changeAdmin(address newAdmin) internal {
        emit IERC1967.AdminChanged(getAdmin(), newAdmin);
        _setAdmin(newAdmin);
    }

    /**
     * @dev The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.
     * This is the keccak-256 hash of "eip1967.proxy.beacon" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

    /**
     * @dev Returns the current beacon.
     */
    function getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    /**
     * @dev Stores a new beacon in the ERC-1967 beacon slot.
     */
    function _setBeacon(address newBeacon) private {
        if (newBeacon.code.length == 0) {
            revert ERC1967InvalidBeacon(newBeacon);
        }

        StorageSlot.getAddressSlot(BEACON_SLOT).value = newBeacon;

        address beaconImplementation = IBeacon(newBeacon).implementation();
        if (beaconImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(beaconImplementation);
        }
    }

    /**
     * @dev Change the beacon and trigger a setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-BeaconUpgraded} event.
     *
     * CAUTION: Invoking this function has no effect on an instance of {BeaconProxy} since v5, since
     * it uses an immutable beacon without looking at the value of the ERC-1967 beacon slot for
     * efficiency.
     */
    function upgradeBeaconToAndCall(address newBeacon, bytes memory data) internal {
        _setBeacon(newBeacon);
        emit IERC1967.BeaconUpgraded(newBeacon);

        if (data.length > 0) {
            Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Reverts if `msg.value` is not zero. It can be used to avoid `msg.value` stuck in the contract
     * if an upgrade doesn't perform an initialization call.
     */
    function _checkNonPayable() private {
        if (msg.value > 0) {
            revert ERC1967NonPayable();
        }
    }
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (proxy/utils/UUPSUpgradeable.sol)







/**
 * @dev An upgradeability mechanism designed for UUPS proxies. The functions included here can perform an upgrade of an
 * {ERC1967Proxy}, when this contract is set as the implementation behind such a proxy.
 *
 * A security mechanism ensures that an upgrade does not turn off upgradeability accidentally, although this risk is
 * reinstated if the upgrade retains upgradeability but removes the security mechanism, e.g. by replacing
 * `UUPSUpgradeable` with a custom implementation of upgrades.
 *
 * The {_authorizeUpgrade} function must be overridden to include access restriction to the upgrade mechanism.
 */
abstract contract UUPSUpgradeable is Initializable, IERC1822Proxiable {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable __self = address(this);

    /**
     * @dev The version of the upgrade interface of the contract. If this getter is missing, both `upgradeTo(address)`
     * and `upgradeToAndCall(address,bytes)` are present, and `upgradeTo` must be used if no function should be called,
     * while `upgradeToAndCall` will invoke the `receive` function if the second argument is the empty byte string.
     * If the getter returns `"5.0.0"`, only `upgradeToAndCall(address,bytes)` is present, and the second argument must
     * be the empty byte string if no function should be called, making it impossible to invoke the `receive` function
     * during an upgrade.
     */
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    /**
     * @dev The call is from an unauthorized context.
     */
    error UUPSUnauthorizedCallContext();

    /**
     * @dev The storage `slot` is unsupported as a UUID.
     */
    error UUPSUnsupportedProxiableUUID(bytes32 slot);

    /**
     * @dev Check that the execution is being performed through a delegatecall call and that the execution context is
     * a proxy contract with an implementation (as defined in ERC-1967) pointing to self. This should only be the case
     * for UUPS and transparent proxies that are using the current contract as their implementation. Execution of a
     * function through ERC-1167 minimal proxies (clones) would not normally pass this test, but is not guaranteed to
     * fail.
     */
    modifier onlyProxy() {
        _checkProxy();
        _;
    }

    /**
     * @dev Check that the execution is not being performed through a delegate call. This allows a function to be
     * callable on the implementing contract but not through proxies.
     */
    modifier notDelegated() {
        _checkNotDelegated();
        _;
    }

    function __UUPSUpgradeable_init() internal onlyInitializing {
    }

    function __UUPSUpgradeable_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the
     * implementation. It is used to validate the implementation's compatibility when performing an upgrade.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.
     */
    function proxiableUUID() external view virtual notDelegated returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    /**
     * @dev Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
     * encoded in `data`.
     *
     * Calls {_authorizeUpgrade}.
     *
     * Emits an {Upgraded} event.
     *
     * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data);
    }

    /**
     * @dev Reverts if the execution is not performed via delegatecall or the execution
     * context is not of a proxy with an ERC-1967 compliant implementation pointing to self.
     * See {_onlyProxy}.
     */
    function _checkProxy() internal view virtual {
        if (
            address(this) == __self || // Must be called through delegatecall
            ERC1967Utils.getImplementation() != __self // Must be called through an active proxy
        ) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Reverts if the execution is performed via delegatecall.
     * See {notDelegated}.
     */
    function _checkNotDelegated() internal view virtual {
        if (address(this) != __self) {
            // Must not be called through delegatecall
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeToAndCall}.
     *
     * Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.
     *
     * ```solidity
     * function _authorizeUpgrade(address) internal onlyOwner {}
     * ```
     */
    function _authorizeUpgrade(address newImplementation) internal virtual;

    /**
     * @dev Performs an implementation upgrade with a security check for UUPS proxies, and additional setup call.
     *
     * As a security check, {proxiableUUID} is invoked in the new implementation, and the return value
     * is expected to be the implementation slot in ERC-1967.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function _upgradeToAndCallUUPS(address newImplementation, bytes memory data) private {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {
            // The implementation is not UUPS
            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}

// ---- node_modules/@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)




/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuardUpgradeable is Initializable {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /// @custom:storage-location erc7201:openzeppelin.storage.ReentrancyGuard
    struct ReentrancyGuardStorage {
        uint256 _status;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ReentrancyGuardStorageLocation = 0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    function _getReentrancyGuardStorage() private pure returns (ReentrancyGuardStorage storage $) {
        assembly {
            $.slot := ReentrancyGuardStorageLocation
        }
    }

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    function __ReentrancyGuard_init() internal onlyInitializing {
        __ReentrancyGuard_init_unchained();
    }

    function __ReentrancyGuard_init_unchained() internal onlyInitializing {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if ($._status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        $._status = ENTERED;
    }

    function _nonReentrantAfter() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        return $._status == ENTERED;
    }
}

// ---- node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)



/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// ---- node_modules/@openzeppelin/contracts/interfaces/IERC20.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

// ---- node_modules/@openzeppelin/contracts/interfaces/IERC165.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

// ---- node_modules/@openzeppelin/contracts/interfaces/IERC1363.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)






/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// ---- node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/utils/SafeERC20.sol)







/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/lib/Constants.sol ----
library Constants {
  uint256 constant SNARK_SCALAR_FIELD =
    21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617;

  address constant NATIVE_ASSET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/lib/ProofLib.sol ----
/**
 * @title ProofLib
 * @notice Facilitates accessing the public signals of a Groth16 proof.
 * @custom:semver 0.1.0
 */
library ProofLib {
  /*///////////////////////////////////////////////////////////////
                         WITHDRAWAL PROOF 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct containing Groth16 proof elements and public signals for withdrawal verification
   * @dev The public signals array must match the order of public inputs/outputs in the circuit
   * @param pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param pubSignals Array of public inputs and outputs:
   *        - [0] newCommitmentHash: Hash of the new commitment being created
   *        - [1] existingNullifierHash: Hash of the nullifier being spent
   *        - [2] withdrawnValue: Amount being withdrawn
   *        - [3] stateRoot: Current state root of the privacy pool
   *        - [4] stateTreeDepth: Current depth of the state tree
   *        - [5] ASPRoot: Current root of the Association Set Provider tree
   *        - [6] ASPTreeDepth: Current depth of the ASP tree
   *        - [7] context: Context value for the withdrawal operation
   */
  struct WithdrawProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[8] pubSignals;
  }

  /**
   * @notice Retrieves the new commitment hash from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The hash of the new commitment being created
   */
  function newCommitmentHash(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[0];
  }

  /**
   * @notice Retrieves the existing nullifier hash from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The hash of the nullifier being spent in this withdrawal
   */
  function existingNullifierHash(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[1];
  }

  /**
   * @notice Retrieves the withdrawn value from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The amount being withdrawn from Privacy Pool
   */
  function withdrawnValue(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[2];
  }

  /**
   * @notice Retrieves the state root from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The root of the state tree at time of proof generation
   */
  function stateRoot(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[3];
  }

  /**
   * @notice Retrieves the state tree depth from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The depth of the state tree at time of proof generation
   */
  function stateTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[4];
  }

  /**
   * @notice Retrieves the ASP root from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The latest root of the ASP tree at time of proof generation
   */
  function ASPRoot(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[5];
  }

  /**
   * @notice Retrieves the ASP tree depth from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The depth of the ASP tree at time of proof generation
   */
  function ASPTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[6];
  }

  /**
   * @notice Retrieves the context value from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The context value binding the proof to specific withdrawal data
   */
  function context(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[7];
  }

  /*///////////////////////////////////////////////////////////////
                          RAGEQUIT PROOF 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct containing Groth16 proof elements and public signals for ragequit verification
   * @dev The public signals array must match the order of public inputs/outputs in the circuit
   * @param pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param pubSignals Array of public inputs and outputs:
   *        - [0] commitmentHash: Hash of the commitment being ragequit
   *        - [1] nullifierHash: Nullifier hash of commitment being ragequit
   *        - [2] value: Value of the commitment being ragequit
   *        - [3] label: Label of commitment
   */
  struct RagequitProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[4] pubSignals;
  }

  /**
   * @notice Retrieves the new commitment hash from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The new commitment hash
   */
  function commitmentHash(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[0];
  }

  /**
   * @notice Retrieves the nullifier hash from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The nullifier hash
   */
  function nullifierHash(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[1];
  }

  /**
   * @notice Retrieves the commitment value from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The commitment value
   */
  function value(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[2];
  }

  /**
   * @notice Retrieves the commitment label from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The commitment label
   */
  function label(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[3];
  }
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IVerifier.sol ----
/**
 * @title IVerifier
 * @notice Interface of the Groth16 verifier contracts
 */
interface IVerifier {
  /**
   * @notice Verifies a Withdrawal Proof
   * @param _pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param _pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param _pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param _pubSignals The proof public signals (both input and output)
   * @return _valid The boolean indicating if the proof is valid
   */
  function verifyProof(
    uint256[2] memory _pA,
    uint256[2][2] memory _pB,
    uint256[2] memory _pC,
    uint256[8] memory _pubSignals
  ) external returns (bool _valid);

  /**
   * @notice Verifies a Ragequit Proof
   * @param _pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param _pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param _pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param _pubSignals The proof public signals (both input and output)
   * @return _valid The boolean indicating if the proof is valid
   */
  function verifyProof(
    uint256[2] memory _pA,
    uint256[2][2] memory _pB,
    uint256[2] memory _pC,
    uint256[4] memory _pubSignals
  ) external returns (bool _valid);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IState.sol ----
/**
 * @title IState
 * @notice Interface for the State contract
 */
interface IState {
  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when inserting a leaf into the Merkle Tree
   * @param _index The index of the leaf in the tree
   * @param _leaf The leaf value
   * @param _root The updated root
   */
  event LeafInserted(uint256 _index, uint256 _leaf, uint256 _root);

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when trying to call a method only available to the Entrypoint
   */
  error OnlyEntrypoint();

  /**
   * @notice Thrown when trying to deposit into a dead pool
   */
  error PoolIsDead();

  /**
   * @notice Thrown when trying to spend a nullifier that has already been spent
   */
  error NullifierAlreadySpent();

  /**
   * @notice Thrown when trying to initiate the ragequitting process of a commitment before the waiting period
   */
  error NotYetRagequitteable();

  /**
   * @notice Thrown when the max tree depth is reached and no more commitments can be inserted
   */
  error MaxTreeDepthReached();

  /**
   * @notice Thrown when trying to set a state variable as address zero
   */
  error ZeroAddress();

  /*///////////////////////////////////////////////////////////////
                              VIEWS 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Returns the pool unique identifier
   * @return _scope The scope id
   */
  function SCOPE() external view returns (uint256 _scope);

  /**
   * @notice Returns the pool asset
   * @return _asset The asset address
   */
  function ASSET() external view returns (address _asset);

  /**
   * @notice Returns the root history size for root caching
   * @return _size The amount of valid roots to store
   */
  function ROOT_HISTORY_SIZE() external view returns (uint32 _size);

  /**
   * @notice Returns the maximum depth of the state tree
   * @dev Merkle tree depth must be capped at a fixed maximum because zero-knowledge circuits
   * compile to R1CS (Rank-1 Constraint System) constraints that must be determined at compile time.
   * R1CS cannot handle dynamic loops or recursion - all computation paths must be fully "unrolled"
   * into a fixed number of constraints. Since each level of the Merkle tree requires its own set
   * of constraints for hashing and path verification, we need to set a maximum depth that determines
   * the total constraint size of the circuit.
   * @return _maxDepth The max depth
   */
  function MAX_TREE_DEPTH() external view returns (uint32 _maxDepth);

  /**
   * @notice Returns the configured Entrypoint contract
   * @return _entrypoint The Entrypoint contract
   */
  function ENTRYPOINT() external view returns (IEntrypoint _entrypoint);

  /**
   * @notice Returns the configured Verifier contract for withdrawals
   * @return _verifier The Verifier contract
   */
  function WITHDRAWAL_VERIFIER() external view returns (IVerifier _verifier);

  /**
   * @notice Returns the configured Verifier contract for ragequits
   * @return _verifier The Verifier contract
   */
  function RAGEQUIT_VERIFIER() external view returns (IVerifier _verifier);

  /**
   * @notice Returns the current root index
   * @return _index The current index
   */
  function currentRootIndex() external view returns (uint32 _index);

  /**
   * @notice Returns the current state root
   * @return _root The current state root
   */
  function currentRoot() external view returns (uint256 _root);

  /**
   * @notice Returns the current state tree depth
   * @return _depth The current state tree depth
   */
  function currentTreeDepth() external view returns (uint256 _depth);

  /**
   * @notice Returns the current state tree size
   * @return _size The current state tree size
   */
  function currentTreeSize() external view returns (uint256 _size);

  /**
   * @notice Returns the current label nonce
   * @return _nonce The current nonce
   */
  function nonce() external view returns (uint256 _nonce);

  /**
   * @notice Returns the boolean indicating if the pool is dead
   * @return _dead The dead boolean
   */
  function dead() external view returns (bool _dead);

  /**
   * @notice Returns the root stored at an index
   * @param _index The root index
   * @return _root The root value
   */
  function roots(uint256 _index) external view returns (uint256 _root);

  /**
   * @notice Returns the spending status of a nullifier hash
   * @param _nullifierHash The nullifier hash
   * @return _spent The boolean indicating if it is spent
   */
  function nullifierHashes(uint256 _nullifierHash) external view returns (bool _spent);

  /**
   * @notice Returns the original depositor that generated a label
   * @param _label The label
   * @return _depositor The original depositor
   */
  function depositors(uint256 _label) external view returns (address _depositor);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IPrivacyPool.sol ----
/**
 * @title IPrivacyPool
 * @notice Interface for the PrivacyPool contract
 */
interface IPrivacyPool is IState {
  /*///////////////////////////////////////////////////////////////
                              STRUCTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct for the withdrawal request
   * @dev The integrity of this data is ensured by the `context` signal in the proof
   * @param processooor The allowed address to process the withdrawal
   * @param data Encoded arbitrary data used by the Entrypoint
   */
  struct Withdrawal {
    address processooor;
    bytes data;
  }

  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when making a user deposit
   * @param _depositor The address of the depositor
   * @param _commitment The commitment hash
   * @param _label The deposit generated label
   * @param _value The deposited amount
   * @param _precommitmentHash The deposit precommitment hash
   */
  event Deposited(
    address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash
  );

  /**
   * @notice Emitted when processing a withdrawal
   * @param _processooor The address which processed the withdrawal
   * @param _value The withdrawn amount
   * @param _spentNullifier The spent nullifier
   * @param _newCommitment The new commitment hash
   */
  event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment);

  /**
   * @notice Emitted when ragequitting a commitment
   * @param _ragequitter The address who ragequit
   * @param _commitment The ragequit commitment
   * @param _label The commitment label
   * @param _value The ragequit amount
   */
  event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value);

  /**
   * @notice Emitted irreversibly suspending deposits
   */
  event PoolDied();

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when failing to verify a withdrawal proof through the Groth16 verifier
   */
  error InvalidProof();

  /**
   * @notice Thrown when trying to spend a commitment that does not exist in the state
   */
  error InvalidCommitment();

  /**
   * @notice Thrown when calling `withdraw` while not being the allowed processooor
   */
  error InvalidProcessooor();

  /**
   * @notice Thrown when calling `withdraw` with a ASP or state tree depth greater or equal than the max tree depth
   */
  error InvalidTreeDepth();

  /**
   * @notice Thrown when trying to deposit an amount higher than 2**128
   */
  error InvalidDepositValue();

  /**
   * @notice Thrown when providing an invalid scope for this pool
   */
  error ScopeMismatch();

  /**
   * @notice Thrown when providing an invalid context for the pool and withdrawal
   */
  error ContextMismatch();

  /**
   * @notice Thrown when providing an unknown or outdated state root
   */
  error UnknownStateRoot();

  /**
   * @notice Thrown when providing an unknown or outdated ASP root
   */
  error IncorrectASPRoot();

  /**
   * @notice Thrown when trying to ragequit while not being the original depositor
   */
  error OnlyOriginalDepositor();

  /*///////////////////////////////////////////////////////////////
                              LOGIC
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Deposit funds into the Privacy Pool
   * @dev Only callable by the Entrypoint
   * @param _depositor The depositor address
   * @param _value The value being deposited
   * @param _precommitment The precommitment hash
   * @return _commitment The commitment hash
   */
  function deposit(
    address _depositor,
    uint256 _value,
    uint256 _precommitment
  ) external payable returns (uint256 _commitment);

  /**
   * @notice Privately withdraw funds by spending an existing commitment
   * @param _w The `Withdrawal` struct
   * @param _p The `WithdrawProof` struct
   */
  function withdraw(Withdrawal memory _w, ProofLib.WithdrawProof memory _p) external;

  /**
   * @notice Publicly withdraw funds to original depositor without exposing secrets
   * @dev Only callable by the original depositor
   * @param _p the `RagequitProof` struct
   */
  function ragequit(ProofLib.RagequitProof memory _p) external;

  /**
   * @notice Irreversibly suspends deposits
   * @dev Withdrawals can never be disabled
   * @dev Only callable by the Entrypoint
   */
  function windDown() external;
}

/**
 * @title IPrivacyPoolSimple
 * @notice Interface for the PrivacyPool native asset implementation
 */
interface IPrivacyPoolSimple is IPrivacyPool {
  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when sending less amount of native asset than required
   */
  error InsufficientValue();

  /**
   * @notice Thrown when failing to send native asset to an account
   */
  error FailedToSendNativeAsset();
}

/**
 * @title IPrivacyPoolComplex
 * @notice Interface for the PrivacyPool ERC20 implementation
 */
interface IPrivacyPoolComplex is IPrivacyPool {
  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when sending sending any amount of native asset
   */
  error NativeAssetNotAccepted();

  /**
   * @notice Thrown when trying to set up a complex pool with the native asset
   */
  error NativeAssetNotSupported();
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IEntrypoint.sol ----
/**
 * @title IEntrypoint
 * @notice Interface for the Entrypoint contract
 */
interface IEntrypoint {
  /*///////////////////////////////////////////////////////////////
                              STRUCTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct for the asset configuration
   * @param pool The Privacy Pool contracts for the asset
   * @param minimumDepositAmount The minimum amount that can be deposited
   * @param vettingfeeBPS The deposit fee in basis points
   */
  struct AssetConfig {
    IPrivacyPool pool;
    uint256 minimumDepositAmount;
    uint256 vettingFeeBPS;
    uint256 maxRelayFeeBPS;
  }

  /**
   * @notice Struct for the relay data
   * @param recipient The recipient of the funds withdrawn from the pool
   * @param feeRecipient The recipient of the fee
   * @param relayfeeBPS The relay fee in basis points
   */
  struct RelayData {
    address recipient;
    address feeRecipient;
    uint256 relayFeeBPS;
  }

  /**
   * @notice Struct for the onchain association set data
   * @param root The ASP root
   * @param ipfsCID The IPFS v1 CID of the ASP data. A content-addressed identifier computed by hashing
   *                the content with SHA-256, adding multicodec/multihash prefixes, and encoding in base32/58.
   *                This uniquely identifies data by its content rather than location.
   * @param timestamp The timestamp on which the root was updated
   */
  struct AssociationSetData {
    uint256 root;
    string ipfsCID;
    uint256 timestamp;
  }

  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when pushing a new root to the association root set
   * @param _root The latest ASP root
   * @param _ipfsCID The IPFS CID of the association set data
   * @param _timestamp The timestamp of root update
   */
  event RootUpdated(uint256 _root, string _ipfsCID, uint256 _timestamp);

  /**
   * @notice Emitted when pushing a new root to the association root set
   * @param _depositor The address of the depositor
   * @param _pool The Privacy Pool contract
   * @param _commitment The commitment hash for the deposit
   * @param _amount The amount of asset deposited
   */
  event Deposited(address indexed _depositor, IPrivacyPool indexed _pool, uint256 _commitment, uint256 _amount);

  /**
   * @notice Emitted when processing a withdrawal through the Entrypoint
   * @param _relayer The address of the relayer
   * @param _recipient The address of the withdrawal recipient
   * @param _asset The asset being withdrawn
   * @param _amount The amount of asset withdrawn
   * @param _feeAmount The fee paid to the relayer
   */
  event WithdrawalRelayed(
    address indexed _relayer, address indexed _recipient, IERC20 indexed _asset, uint256 _amount, uint256 _feeAmount
  );

  /**
   * @notice Emitted when withdrawing fees from the Entrypoint
   * @param _asset The asset being withdrawn
   * @param _recipient The address of the fees withdrawal recipient
   * @param _amount The amount of asset withdrawn
   */
  event FeesWithdrawn(IERC20 _asset, address _recipient, uint256 _amount);

  /**
   * @notice Emitted when winding down a Privacy Pool
   * @param _pool The Privacy Pool contract
   */
  event PoolWindDown(IPrivacyPool _pool);

  /**
   * @notice Emitted when registering a Privacy Pool in the Entrypoint registry
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _scope The unique scope of the pool
   */
  event PoolRegistered(IPrivacyPool _pool, IERC20 _asset, uint256 _scope);

  /**
   * @notice Emitted when removing a Privacy Pool from the Entrypoint registry
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _scope The unique scope of the pool
   */
  event PoolRemoved(IPrivacyPool _pool, IERC20 _asset, uint256 _scope);

  /**
   * @notice Emitted when updating the configuration of a Privacy Pool
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _newMinimumDepositAmount The updated minimum deposit amount
   * @param _newVettingFeeBPS The updated vetting fee in basis points
   * @param _newMaxRelayFeeBPS The updated maximum relay fee in basis points
   */
  event PoolConfigurationUpdated(
    IPrivacyPool _pool,
    IERC20 _asset,
    uint256 _newMinimumDepositAmount,
    uint256 _newVettingFeeBPS,
    uint256 _newMaxRelayFeeBPS
  );

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when trying to withdraw an invalid amount
   */
  error InvalidWithdrawalAmount();

  /**
   * @notice Thrown when trying to access a non-existent pool
   */
  error PoolNotFound();

  /**
   * @notice Thrown when trying to register a dead pool
   */
  error PoolIsDead();

  /**
   * @notice Thrown when trying to register a pool whose configured Entrypoint is not this one
   */
  error InvalidEntrypointForPool();

  /**
   * @notice Thrown when trying to register a pool for an asset that is already present in the registry
   */
  error AssetPoolAlreadyRegistered();

  /**
   * @notice Thrown when trying to register a pool for a scope that is already present in the registry
   */
  error ScopePoolAlreadyRegistered();

  /**
   * @notice Thrown when trying to deposit less than the minimum deposit amount
   */
  error MinimumDepositAmount();

  /**
   * @notice Thrown when trying to relay with a relayer fee greater than the maximum configured
   */
  error RelayFeeGreaterThanMax();

  /**
   * @notice Thrown when trying to process a withdrawal with an invalid processooor
   */
  error InvalidProcessooor();

  /**
   * @notice Thrown when finding an invalid state in the pool like an invalid asset balance
   */
  error InvalidPoolState();

  /**
   * @notice Thrown when trying to push a an IPFS CID with an invalid length
   */
  error InvalidIPFSCIDLength();

  /**
   * @notice Thrown when trying to push a root with an empty root
   */
  error EmptyRoot();

  /**
   * @notice Thrown when failing to send the native asset to an account
   */
  error NativeAssetTransferFailed();

  /**
   * @notice Thrown when an address parameter is zero
   */
  error ZeroAddress();

  /**
   * @notice Thrown when a fee in basis points is greater than 10000 (100%)
   */
  error InvalidFeeBPS();

  /**
   * @notice Thrown when trying to access an association set at an invalid index
   */
  error InvalidIndex();

  /**
   * @notice Thrown when trying to get the latest root when no roots exist
   */
  error NoRootsAvailable();

  /**
   * @notice Thrown when trying to register a pool with an asset that doesn't match the pool's asset
   */
  error AssetMismatch();

  /**
   * @notice Thrown when trying to send native asset to the Entrypoint
   */
  error NativeAssetNotAccepted();

  /**
   * @notice Thrown when trying to deposit using a precommitment that has already been used by another deposit
   */
  error PrecommitmentAlreadyUsed();

  /*//////////////////////////////////////////////////////////////
                                LOGIC
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Initializes the contract state
   * @param _owner The initial owner
   * @param _postman The initial postman
   */
  function initialize(address _owner, address _postman) external;

  /**
   * @notice Push a new root to the association root set
   * @param _root The new ASP root
   * @param _ipfsCID The IPFS v1 CID of the association set data
   * @return _index The index of the newly added root
   */
  function updateRoot(uint256 _root, string memory _ipfsCID) external returns (uint256 _index);

  /**
   * @notice Make a native asset deposit into the Privacy Pool
   * @param _precommitment The precommitment for the deposit
   * @return _commitment The deposit commitment hash
   */
  function deposit(uint256 _precommitment) external payable returns (uint256 _commitment);

  /**
   * @notice Make an ERC20 deposit into the Privacy Pool
   * @param _asset The asset to deposit
   * @param _value The amount of asset to deposit
   * @param _precommitment The precommitment for the deposit
   * @return _commitment The deposit commitment hash
   */
  function deposit(IERC20 _asset, uint256 _value, uint256 _precommitment) external returns (uint256 _commitment);

  /**
   * @notice Process a withdrawal
   * @param _withdrawal The `Withdrawal` struct
   * @param _proof The `WithdrawProof` struct containing the withdarawal proof signals
   * @param _scope The Pool scope to withdraw from
   */
  function relay(
    IPrivacyPool.Withdrawal calldata _withdrawal,
    ProofLib.WithdrawProof calldata _proof,
    uint256 _scope
  ) external;

  /**
   * @notice Register a Privacy Pool in the registry
   * @param _asset The asset of the pool
   * @param _pool The address of the Privacy Pool contract
   * @param _minimumDepositAmount The minimum deposit amount for the asset
   * @param _vettingFeeBPS The deposit fee in basis points
   * @param _maxRelayFeeBPS The maximum relay fee in basis points
   */
  function registerPool(
    IERC20 _asset,
    IPrivacyPool _pool,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external;

  /**
   * @notice Remove a Privacy Pool from the registry
   * @param _asset The asset of the pool
   */
  function removePool(IERC20 _asset) external;

  /**
   * @notice Updates the configuration of a specific pool
   * @param _asset The asset of the pool to update
   * @param _minimumDepositAmount The new minimum deposit amount
   * @param _vettingFeeBPS The new vetting fee in basis points
   * @param _maxRelayFeeBPS The new max relay fee in basis points
   */
  function updatePoolConfiguration(
    IERC20 _asset,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external;

  /**
   * @notice Irreversebly halt deposits from a Privacy Pool
   * @param _pool The Privacy Pool contract
   */
  function windDownPool(IPrivacyPool _pool) external;

  /**
   * @notice Withdraw fees from the Entrypoint
   * @param _asset The asset to withdraw
   * @param _recipient The recipient of the fees
   */
  function withdrawFees(IERC20 _asset, address _recipient) external;

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Returns the configured pool for a scope
   * @param _scope The unique scope of the pool
   * @return _pool The Privacy Pool contract
   */
  function scopeToPool(uint256 _scope) external view returns (IPrivacyPool _pool);

  /**
   * @notice Returns the configuration for an asset
   * @param _asset The asset address
   * @return _pool The Privacy Pool contract
   * @return _minimumDepositAmount The minimum deposit amount
   * @return _vettingFeeBPS The deposit fee in basis points
   * @return _maxRelayFeeBPS The max relayer fee in basis points
   */
  function assetConfig(IERC20 _asset)
    external
    view
    returns (IPrivacyPool _pool, uint256 _minimumDepositAmount, uint256 _vettingFeeBPS, uint256 _maxRelayFeeBPS);

  /**
   * @notice Returns the association set data at an index
   * @param _index The index of the array
   * @return _root The updated ASP root
   * @return _ipfsCID The IPFS v1 CID for the association set data
   * @return _timestamp The timestamp of the root update
   */
  function associationSets(uint256 _index)
    external
    view
    returns (uint256 _root, string memory _ipfsCID, uint256 _timestamp);

  /**
   * @notice Returns the latest ASP root
   * @return _root The latest ASP root
   */
  function latestRoot() external view returns (uint256 _root);

  /**
   * @notice Returns an ASP root by index
   * @param _index The index
   * @return _root The ASP root at the index
   */
  function rootByIndex(uint256 _index) external view returns (uint256 _root);

  /**
   * @notice Returns a boolean indicating if the precommitment has been used
   * @param _precommitment The precommitment hash
   * @return _used The usage status
   */
  function usedPrecommitments(uint256 _precommitment) external view returns (bool _used);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/Entrypoint.sol ----
/*

Made with ♥ for 0xBow by

░██╗░░░░░░░██╗░█████╗░███╗░░██╗██████╗░███████╗██████╗░██╗░░░░░░█████╗░███╗░░██╗██████╗░
░██║░░██╗░░██║██╔══██╗████╗░██║██╔══██╗██╔════╝██╔══██╗██║░░░░░██╔══██╗████╗░██║██╔══██╗
░╚██╗████╗██╔╝██║░░██║██╔██╗██║██║░░██║█████╗░░██████╔╝██║░░░░░███████║██╔██╗██║██║░░██║
░░████╔═████║░██║░░██║██║╚████║██║░░██║██╔══╝░░██╔══██╗██║░░░░░██╔══██║██║╚████║██║░░██║
░░╚██╔╝░╚██╔╝░╚█████╔╝██║░╚███║██████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║██████╔╝
░░░╚═╝░░░╚═╝░░░╚════╝░╚═╝░░╚══╝╚═════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚═════╝░

https://defi.sucks/

*/














/**
 * @title Entrypoint
 * @notice Serves as the main entrypoint for a series of ASP-operated Privacy Pools
 */
contract Entrypoint is AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, IEntrypoint {
  using SafeERC20 for IERC20;
  using ProofLib for ProofLib.WithdrawProof;

  /// @dev 0xb19546dff01e856fb3f010c267a7b1c60363cf8a4664e21cc89c26224620214e
  bytes32 internal constant _OWNER_ROLE = keccak256('OWNER_ROLE');
  /// @dev 0xfc84ade01695dae2ade01aa4226dc40bdceaf9d5dbd3bf8630b1dd5af195bbc5
  bytes32 internal constant _ASP_POSTMAN = keccak256('ASP_POSTMAN');

  /// @inheritdoc IEntrypoint
  mapping(uint256 _scope => IPrivacyPool _pool) public scopeToPool;

  /// @inheritdoc IEntrypoint
  mapping(IERC20 _asset => AssetConfig _config) public assetConfig;

  /// @inheritdoc IEntrypoint
  AssociationSetData[] public associationSets;

  /// @inheritdoc IEntrypoint
  mapping(uint256 _precommitment => bool _used) public usedPrecommitments;

  /*///////////////////////////////////////////////////////////////
                          INITIALIZATION
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Disables initializers. Using UUPS upgradeability pattern
   */
  constructor() {
    _disableInitializers();
  }

  /// @inheritdoc IEntrypoint
  function initialize(address _owner, address _postman) external initializer {
    // Sanity check initial addresses
    if (_owner == address(0)) revert ZeroAddress();
    if (_postman == address(0)) revert ZeroAddress();

    // Initialize upgradeable contracts
    __UUPSUpgradeable_init();
    __ReentrancyGuard_init();
    __AccessControl_init();

    // Initialize roles
    _setRoleAdmin(DEFAULT_ADMIN_ROLE, _OWNER_ROLE);
    _setRoleAdmin(_OWNER_ROLE, _OWNER_ROLE); // Owner can manage owner role
    _setRoleAdmin(_ASP_POSTMAN, _OWNER_ROLE); // Owner can manage postman role

    _grantRole(_OWNER_ROLE, _owner);
    _grantRole(_ASP_POSTMAN, _postman);
  }

  /*///////////////////////////////////////////////////////////////
                      ASSOCIATION SET METHODS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IEntrypoint
  function updateRoot(uint256 _root, string memory _ipfsCID) external onlyRole(_ASP_POSTMAN) returns (uint256 _index) {
    // Check provided values are non-zero
    if (_root == 0) revert EmptyRoot();
    uint256 _cidLength = bytes(_ipfsCID).length;
    if (_cidLength < 32 || _cidLength > 64) revert InvalidIPFSCIDLength();

    // Push new association set and update index
    associationSets.push(AssociationSetData(_root, _ipfsCID, block.timestamp));
    _index = associationSets.length - 1;

    emit RootUpdated(_root, _ipfsCID, block.timestamp);
  }

  /*///////////////////////////////////////////////////////////////
                          DEPOSIT METHODS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IEntrypoint
  function deposit(uint256 _precommitment) external payable nonReentrant returns (uint256 _commitment) {
    // Handle deposit as native asset
    _commitment = _handleDeposit(IERC20(Constants.NATIVE_ASSET), msg.value, _precommitment);
  }

  /// @inheritdoc IEntrypoint
  function deposit(
    IERC20 _asset,
    uint256 _value,
    uint256 _precommitment
  ) external nonReentrant returns (uint256 _commitment) {
    // Pull funds from user
    _asset.safeTransferFrom(msg.sender, address(this), _value);
    // Handle deposit as ERC20
    _commitment = _handleDeposit(_asset, _value, _precommitment);
  }

  /*///////////////////////////////////////////////////////////////
                               RELAY
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IEntrypoint
  function relay(
    IPrivacyPool.Withdrawal calldata _withdrawal,
    ProofLib.WithdrawProof calldata _proof,
    uint256 _scope
  ) external nonReentrant {
    // Check withdrawn amount is non-zero
    if (_proof.withdrawnValue() == 0) revert InvalidWithdrawalAmount();
    // Check allowed processooor is this Entrypoint
    if (_withdrawal.processooor != address(this)) revert InvalidProcessooor();

    // Fetch pool by scope
    IPrivacyPool _pool = scopeToPool[_scope];
    if (address(_pool) == address(0)) revert PoolNotFound();

    // Store pool asset
    IERC20 _asset = IERC20(_pool.ASSET());
    uint256 _balanceBefore = _assetBalance(_asset);

    // Process withdrawal
    _pool.withdraw(_withdrawal, _proof);

    // Decode relay data
    RelayData memory _data = abi.decode(_withdrawal.data, (RelayData));

    if (_data.relayFeeBPS > assetConfig[_asset].maxRelayFeeBPS) revert RelayFeeGreaterThanMax();

    uint256 _withdrawnAmount = _proof.withdrawnValue();

    // Deduct fees
    uint256 _amountAfterFees = _deductFee(_withdrawnAmount, _data.relayFeeBPS);

    uint256 _feeAmount = _withdrawnAmount - _amountAfterFees;

    // Transfer withdrawn funds to recipient
    _transfer(_asset, _data.recipient, _amountAfterFees);
    // Transfer fees to fee recipient
    _transfer(_asset, _data.feeRecipient, _feeAmount);

    // Check pool balance has not been reduced
    uint256 _balanceAfter = _assetBalance(_asset);
    if (_balanceBefore > _balanceAfter) revert InvalidPoolState();

    emit WithdrawalRelayed(msg.sender, _data.recipient, _asset, _withdrawnAmount, _feeAmount);
  }

  /*///////////////////////////////////////////////////////////////
                          POOL MANAGEMENT 
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IEntrypoint
  function registerPool(
    IERC20 _asset,
    IPrivacyPool _pool,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external onlyRole(_OWNER_ROLE) {
    // Sanity check addresses
    if (address(_asset) == address(0)) revert ZeroAddress();
    if (address(_pool) == address(0)) revert ZeroAddress();

    // Fetch pool configuration
    AssetConfig storage _config = assetConfig[_asset];
    if (address(_config.pool) != address(0)) revert AssetPoolAlreadyRegistered();

    if (_pool.dead()) revert PoolIsDead();
    if (address(_pool.ENTRYPOINT()) != address(this)) revert InvalidEntrypointForPool();

    // Fetch pool scope and validate asset
    uint256 _scope = _pool.SCOPE();
    if (address(scopeToPool[_scope]) != address(0)) revert ScopePoolAlreadyRegistered();
    if (_asset != IERC20(_pool.ASSET())) revert AssetMismatch();

    // Store pool configuration
    scopeToPool[_scope] = _pool;
    _config.pool = _pool;

    // Update pool configuration with validation
    _setPoolConfiguration(_config, _minimumDepositAmount, _vettingFeeBPS, _maxRelayFeeBPS);

    // If asset is an ERC20, approve pool to spend
    if (address(_asset) != Constants.NATIVE_ASSET) _asset.forceApprove(address(_pool), type(uint256).max);

    emit PoolRegistered(_pool, _asset, _scope);
  }

  /// @inheritdoc IEntrypoint
  function removePool(IERC20 _asset) external onlyRole(_OWNER_ROLE) {
    // Fetch pool by asset
    IPrivacyPool _pool = assetConfig[_asset].pool;
    if (address(_pool) == address(0)) revert PoolNotFound();

    // Fetch pool scope
    uint256 _scope = _pool.SCOPE();

    // If asset is an ERC20, revoke pool allowance
    if (address(_asset) != Constants.NATIVE_ASSET) _asset.forceApprove(address(_pool), 0);

    // Remove pool configuration
    delete scopeToPool[_scope];
    delete assetConfig[_asset];

    emit PoolRemoved(_pool, _asset, _scope);
  }

  /// @inheritdoc IEntrypoint
  function updatePoolConfiguration(
    IERC20 _asset,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external onlyRole(_OWNER_ROLE) {
    // Fetch pool configuration
    AssetConfig storage _config = assetConfig[_asset];
    if (address(_config.pool) == address(0)) revert PoolNotFound();

    // Update pool configuration with validation
    _setPoolConfiguration(_config, _minimumDepositAmount, _vettingFeeBPS, _maxRelayFeeBPS);

    emit PoolConfigurationUpdated(_config.pool, _asset, _minimumDepositAmount, _vettingFeeBPS, _maxRelayFeeBPS);
  }

  /// @inheritdoc IEntrypoint
  function windDownPool(IPrivacyPool _pool) external onlyRole(_OWNER_ROLE) {
    // Call `windDown` on pool
    _pool.windDown();

    emit PoolWindDown(_pool);
  }

  /// @inheritdoc IEntrypoint
  function withdrawFees(IERC20 _asset, address _recipient) external nonReentrant onlyRole(_OWNER_ROLE) {
    // Fetch current asset balance
    uint256 _balance = _assetBalance(_asset);

    // Transfer funds
    _transfer(_asset, _recipient, _balance);

    emit FeesWithdrawn(_asset, _recipient, _balance);
  }

  /*///////////////////////////////////////////////////////////////
                           VIEW METHODS 
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IEntrypoint
  function latestRoot() external view returns (uint256 _root) {
    if (associationSets.length == 0) revert NoRootsAvailable();
    _root = associationSets[associationSets.length - 1].root;
  }

  /// @inheritdoc IEntrypoint
  function rootByIndex(uint256 _index) external view returns (uint256 _root) {
    if (_index >= associationSets.length) revert InvalidIndex();
    _root = associationSets[_index].root;
  }

  /*///////////////////////////////////////////////////////////////
                            RECEIVE
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Needed to receive native asset from a pool when withdrawing
   * @dev Only accepts native asset from the local native asset pool
   */
  receive() external payable {
    address _nativePool = address(assetConfig[IERC20(Constants.NATIVE_ASSET)].pool);
    if (msg.sender != _nativePool) revert NativeAssetNotAccepted();
  }

  /*///////////////////////////////////////////////////////////////
                        INTERNAL METHODS 
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc UUPSUpgradeable
  function _authorizeUpgrade(address) internal override onlyRole(_OWNER_ROLE) {}

  /**
   * @notice Handle deposit logic for both native asset and ERC20 deposits
   * @param _asset The asset being deposited
   * @param _value The amount being deposited
   * @param _precommitment The precommitment for the deposit
   * @return _commitment The deposit commitment hash
   */
  function _handleDeposit(IERC20 _asset, uint256 _value, uint256 _precommitment) internal returns (uint256 _commitment) {
    // Fetch pool by asset
    AssetConfig memory _config = assetConfig[_asset];
    IPrivacyPool _pool = _config.pool;
    if (address(_pool) == address(0)) revert PoolNotFound();

    // Check if the `_precommitment` has already been used
    if (usedPrecommitments[_precommitment]) revert PrecommitmentAlreadyUsed();
    // Mark it as used
    usedPrecommitments[_precommitment] = true;

    // Check minimum deposit amount
    if (_value < _config.minimumDepositAmount) revert MinimumDepositAmount();

    // Deduct vetting fees
    uint256 _amountAfterFees = _deductFee(_value, _config.vettingFeeBPS);

    // Deposit commitment into pool (forwarding native asset if applicable)
    uint256 _nativeAssetValue = address(_asset) == Constants.NATIVE_ASSET ? _amountAfterFees : 0;
    _commitment = _pool.deposit{value: _nativeAssetValue}(msg.sender, _amountAfterFees, _precommitment);

    emit Deposited(msg.sender, _pool, _commitment, _amountAfterFees);
  }

  /**
   * @notice Transfer out an asset to a recipient
   * @param _asset The asset to send
   * @param _recipient The recipient address
   * @param _amount The amount to send
   */
  function _transfer(IERC20 _asset, address _recipient, uint256 _amount) internal {
    if (_recipient == address(0)) revert ZeroAddress();

    if (_asset == IERC20(Constants.NATIVE_ASSET)) {
      (bool _success,) = _recipient.call{value: _amount}('');
      if (!_success) revert NativeAssetTransferFailed();
    } else {
      _asset.safeTransfer(_recipient, _amount);
    }
  }

  /**
   * @notice Fetch asset balance for the Entrypoint
   * @param _asset The asset address
   * @return _balance The asset balance
   */
  function _assetBalance(IERC20 _asset) internal view returns (uint256 _balance) {
    if (_asset == IERC20(Constants.NATIVE_ASSET)) {
      _balance = address(this).balance;
    } else {
      _balance = _asset.balanceOf(address(this));
    }
  }

  /**
   * @notice Deduct fees from an amount
   * @param _amount The amount before fees
   * @param _feeBPS The fee in basis points
   * @return _afterFees The amount after fees are deducted
   */
  function _deductFee(uint256 _amount, uint256 _feeBPS) internal pure returns (uint256 _afterFees) {
    _afterFees = _amount - ((_amount * _feeBPS) / 10_000);
  }

  /**
   * @notice Sets pool configuration parameters with validation
   * @dev Validates and sets minimum deposit amount and vetting fee
   * @param _config The pool configuration to update
   * @param _minimumDepositAmount The new minimum deposit amount
   * @param _vettingFeeBPS The new vetting fee in basis points
   * @param _maxRelayFeeBPS The maximum relay fee in basis points
   */
  function _setPoolConfiguration(
    AssetConfig storage _config,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) internal {
    // Check fee is less than 100%
    if (_vettingFeeBPS >= 10_000 || _maxRelayFeeBPS >= 10_000) revert InvalidFeeBPS();

    _config.minimumDepositAmount = _minimumDepositAmount;
    _config.vettingFeeBPS = _vettingFeeBPS;
    _config.maxRelayFeeBPS = _maxRelayFeeBPS;
  }
}