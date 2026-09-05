export interface ICreateRole {
    name: string;
    description?: string;
}

export interface IUpdateRole {
    name?: string;
    description?: string;
}

export interface IReplaceRolePermissions {
    permission_ids: string[];
}

