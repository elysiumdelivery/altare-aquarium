import { setupDetailsDialog, updateDetailsDialog, DETAILS_DIALOG_A11Y } from "./dialog.js";
import { Aquarium } from "./aquarium/aquarium.js"

const FISH_DATA_PATH = "fish.csv";

async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
            download: true,
            //To treat the first row as column titles
            header: true,
            complete: function(results) {
                resolve(results.data);
            },
            error: reject
        });
    })
}

async function main() {
    
    window.fishAriaDiv = document.getElementById("fish-aria");
    await setupDetailsDialog();
    window.aquarium = Aquarium;
    // Quality settings selector for aquarium
    let qualitySelector = document.getElementById("quality-settings");
    qualitySelector.addEventListener("change", (e) => {
        let newResolution;
        switch (e.target.value) {
            case "Low": 
                newResolution = 0.5;
                window.aquarium.toggleFilters(false);
                break;
            case "Medium":
                newResolution = 0.95;
                window.aquarium.toggleFilters(true);
                break;
            case "High": 
                newResolution = 1.25;
                window.aquarium.toggleFilters(true);
                break;
        }
        window.aquarium.app.renderer.resolution = newResolution;
        window.aquarium.resize();

    })
    let data = await parseCSV(FISH_DATA_PATH);
    Aquarium.init(data).then(() => {        
        // Remove loading screen. We've loaded in everything
        let loader = document.getElementById("loader");
        loader.remove();
        
        Aquarium.addGameStateListener("onFishClicked", (fishData) => {
            // Open dialog info on selected fish
            updateDetailsDialog(fishData.idx, fishData.data);
            DETAILS_DIALOG_A11Y.show();
        });
    });

}

window.onload = () => {
    main();
}