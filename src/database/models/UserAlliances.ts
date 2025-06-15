import { Model } from 'objection';
import AllianceMembers from './AllianceMembers';

interface UserAlliances {
  id: string;
  user_id: string;
  alliance_id: string;
  original_nickname: string | null;
  joined_at: Date;
  updated_at: Date;
}

class UserAlliances extends Model implements UserAlliances {
  static tableName = 'user_alliances';

  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['user_id', 'alliance_id'],
    properties: {
      id: { type: 'string' },
      user_id: { type: 'string' },
      alliance_id: { type: 'string' },
      original_nickname: { type: ['string', 'null'] },
      joined_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    },
  }

  static relationMappings = {
    alliance: {
      relation: Model.BelongsToOneRelation,
      modelClass: AllianceMembers,
      join: {
        from: 'user_alliances.alliance_id',
        to: 'alliance_members.id'
      }
    }
  };
}

export default UserAlliances; 