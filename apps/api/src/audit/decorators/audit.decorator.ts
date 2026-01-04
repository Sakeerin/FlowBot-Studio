import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit:action';
export const AUDIT_TARGET_TYPE_KEY = 'audit:targetType';

export const Audit = (action: string, targetType: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(AUDIT_ACTION_KEY, action)(target, propertyKey, descriptor);
    SetMetadata(AUDIT_TARGET_TYPE_KEY, targetType)(target, propertyKey, descriptor);
  };
};

