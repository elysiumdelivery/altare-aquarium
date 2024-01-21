import { setupDetailsDialog, updateDetailsDialog, DETAILS_DIALOG_A11Y } from "./dialog.js";
import { Aquarium, LEVELS, WORLD_WIDTH, WORLD_HEIGHT, lerp, clamp } from "./aquarium/aquarium.js"

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
    let backToTopButton = document.getElementById("back-to-top");
    backToTopButton.addEventListener("click", () => {
        window.aquarium.viewport.animate({
            time: (window.aquarium.viewport.top / WORLD_HEIGHT) * 3000,
            position: new PIXI.Point(window.aquarium.viewport.left, 0),
            ease: "easeInOutCirc",
            removeOnInterrupt: true
        });
    })
    // Quality settings selector for aquarium
    let qualitySelector = document.getElementById("quality-settings-dropdown");
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
    let overlayToggle = document.getElementById("overlay-toggle-checkbox");
    overlayToggle.addEventListener("change", (e) => {
        aquarium.overlay.visible = e.target.checked;
    })
    Aquarium.addGameStateListener("onViewportUpdate", (viewport) => {
        let screenCoords = viewport.toScreen(viewport.worldWidth / 2, 50);
        if (window.innerHeight > window.innerWidth) {
            document.getElementById("nav").style.top = null;
        }
        else {
            document.getElementById("nav").style.top = `calc(${screenCoords.y}px + 15vmin)`;
        }
        if (window.aquarium.viewport.top < LEVELS.Surface) {
            document.getElementById("title-header").style.top = screenCoords.y;
        }
        
        document.getElementById("back-to-top").style.opacity = clamp(lerp(0, 1, (window.aquarium.viewport.center.y - LEVELS.Top) / (LEVELS.Top + 100)), 0, 1);
        
    })
    let data = await parseCSV(FISH_DATA_PATH);
    Aquarium.init(data).then(() => {        
        // Remove loading screen. We've loaded in everything
        let loader = document.getElementById("loader");
        
        Aquarium.addGameStateListener("onFishClicked", (fishData) => {
            // Open dialog info on selected fish
            updateDetailsDialog(fishData.idx, fishData.data);
            DETAILS_DIALOG_A11Y.show();
        });

        overlayToggle.checked = aquarium.overlay.visible;

        loader.classList.add("fade");
        setTimeout(() => {
            loader.remove();
        }, 750);
    });

}

window.onload = () => {
    main();
}