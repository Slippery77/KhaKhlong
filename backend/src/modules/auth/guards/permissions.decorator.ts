import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
export const ANY_PERMISSIONS_KEY = 'any_permissions';
export const RequireAnyPermission = (...perms: string[]) => SetMetadata(ANY_PERMISSIONS_KEY, perms);
export const ANY_AUTHENTICATED_KEY = 'anyAuthenticated';
export const AnyAuthenticated = () => SetMetadata(ANY_AUTHENTICATED_KEY, true);