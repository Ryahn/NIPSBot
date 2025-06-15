import { Model } from 'objection';

type PactType = 'Non Aggression' | 'Mutual Friendship' | 'Call To Arms' | 'Protectorate';

interface AllianceMembers {
  id: string;
  name: string;
  tag: string;
  pact_type: PactType[];
  role_name: string;
  role_id: string;
  channel_name: string;
  channel_id: string;
}

class AllianceMembers extends Model implements AllianceMembers {
  static tableName = 'alliance_members';

  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['name', 'tag', 'pact_type', 'role_name', 'role_id', 'channel_name', 'channel_id'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      tag: { type: 'string' },
      pact_type: { 
        type: 'array',
        items: { type: 'string', enum: ['Non Aggression', 'Mutual Friendship', 'Call To Arms', 'Protectorate'] }
      },
      role_name: { type: 'string' },
      role_id: { type: 'string' },
      channel_name: { type: 'string' },
      channel_id: { type: 'string' },
    },
  }
}

export default AllianceMembers;