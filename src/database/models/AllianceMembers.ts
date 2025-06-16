import { Model } from 'objection';

interface AllianceMembers {
  id: string;
  name: string;
  tag: string;
  role_name: string;
  role_id: string;
}

class AllianceMembers extends Model implements AllianceMembers {
  static tableName = 'alliance_members';

  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['name', 'tag', 'role_name', 'role_id'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      tag: { type: 'string' },
      role_name: { type: 'string' },
      role_id: { type: 'string' },
    },
  }
}

export default AllianceMembers;