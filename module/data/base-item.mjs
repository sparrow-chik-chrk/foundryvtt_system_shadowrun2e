import Shadowrun2EDataModel from "./base-model.mjs";

export default class Shadowrun2EItemBase extends Shadowrun2EDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    return schema;
  }

}