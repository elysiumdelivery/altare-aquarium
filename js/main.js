import { setupDetailsDialog, updateDetailsDialog, DETAILS_DIALOG_A11Y } from "./dialog.js";
import { Aquarium } from "./aquarium/aquarium.js"

async function main() {
    window.fishAriaDiv = document.getElementById("fish-aria");
    await setupDetailsDialog();
    window.aquarium = Aquarium;
    window.aquarium.settings.filters = false;
    await Aquarium.init();
    
    Aquarium.addGameStateListener("onFishClicked", (data) => {
        updateDetailsDialog(`Fish #${data.idx}`);
        DETAILS_DIALOG_A11Y.show();
    });
}

window.onload = () => {
    main();
}