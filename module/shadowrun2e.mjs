// Import document classes.
import {Shadowrun2EActor} from "./documents/actor.mjs";
import {Shadowrun2EItem} from "./documents/item.mjs";
// Import sheet classes.
import {Shadowrun2EActorSheet} from "./sheets/actor-sheet.mjs";
import {Shadowrun2EItemSheet} from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import {preloadHandlebarsTemplates} from "./helpers/templates.mjs";
import {SHADOWRUN_2E} from "./helpers/config.mjs";
// Import DataModel classes
import * as models from "./data/_module.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function () {
    // Add utility classes to the global game object so that they're more easily
    // accessible in global contexts.
    game.shadowrun2e = {
        Shadowrun2EActor,
        Shadowrun2EItem,
        rollItemMacro,
    };

    // Add custom constants for configuration.
    CONFIG.SHADOWRUN_2E = SHADOWRUN_2E;

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: "1d20 + @abilities.dex.mod",
        decimals: 2,
    };

    // Define custom Document and DataModel classes
    CONFIG.Actor.documentClass = Shadowrun2EActor;

    // Note that you don't need to declare a DataModel
    // for the base actor/item classes - they are included
    // with the Character/NPC as part of super.defineSchema()
    CONFIG.Actor.dataModels = {
        character: models.Shadowrun2ECharacter,
        npc: models.Shadowrun2ENPC
    }
    CONFIG.Item.documentClass = Shadowrun2EItem;
    CONFIG.Item.dataModels = {
        item: models.Shadowrun2EItem,
        feature: models.Shadowrun2EFeature,
        spell: models.Shadowrun2ESpell
    }

    // Active Effects are never copied to the Actor,
    // but will still apply to the Actor from within the Item
    // if the transfer property on the Active Effect is true.
    CONFIG.ActiveEffect.legacyTransferral = false;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("shadowrun2e", Shadowrun2EActorSheet, {
        makeDefault: true,
        label: "SHADOWRUN_2E.SheetLabels.Actor",
    });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("shadowrun2e", Shadowrun2EItemSheet, {
        makeDefault: true,
        label: "SHADOWRUN_2E.SheetLabels.Item",
    });

    // Preload Handlebars templates.
    return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", function (str) {
    return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */

/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
    // First, determine if this is a valid owned item.
    if (data.type !== "Item") return;
    if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
        return ui.notifications.warn(
            "You can only create macro buttons for owned Items"
        );
    }
    // If it is, retrieve it based on the uuid.
    const item = await Item.fromDropData(data);

    // Create the macro command using the uuid.
    const command = `game.shadowrun2e.rollItemMacro("${data.uuid}");`;
    let macro = game.macros.find(
        (m) => m.name === item.name && m.command === command
    );
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: {"shadowrun2e.itemMacro": true},
        });
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
    // Reconstruct the drop data so that we can load the item.
    const dropData = {
        type: "Item",
        uuid: itemUuid,
    };
    // Load the item from the uuid.
    Item.fromDropData(dropData).then((item) => {
        // Determine if the item loaded and if it's an owned item.
        if (!item || !item.parent) {
            const itemName = item?.name ?? itemUuid;
            return ui.notifications.warn(
                `Could not find item ${itemName}. You may need to delete and recreate this macro.`
            );
        }

        // Trigger the item roll
        item.roll();
    });
}
