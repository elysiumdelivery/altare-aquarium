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
    let volumeButton = document.getElementById("bgm-toggle");
    volumeButton.onclick = function () {
        let states = ["full", "low", "mute"];
        let state = this.getAttribute("state");
        let stateIdx = states.indexOf(state);
        stateIdx++;
        if (stateIdx < 0 || stateIdx >= states.length) stateIdx = 0;
        switch (states[stateIdx]) {
            case "full": document.getElementById("bgm").volume = 1; break;
            case "low": document.getElementById("bgm").volume = 0.25; break;
            case "mute": document.getElementById("bgm").volume = 0; break;
        }
        this.setAttribute("state", states[stateIdx]);
        this.ariaLabel = `Volume set to ${states[stateIdx]}. Toggle to change.`
    }
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
        let nav = document.getElementById("nav");
        let titleHeader = document.getElementById("title-header");
        if (window.innerHeight > window.innerWidth) {
            nav.style.top = null;
        }
        else {
            nav.style.top = `calc(${screenCoords.y}px + 12vmin)`;
        }
        if (window.aquarium.viewport.top < LEVELS.Surface) {
            titleHeader.style.top = screenCoords.y;
        }
        
        document.getElementById("back-to-top").style.opacity = clamp(lerp(0, 1, (window.aquarium.viewport.center.y - LEVELS.Top) / (LEVELS.Top + 100)), 0, 1);

        if (window.innerWidth < window.innerHeight) {
            let bgmNode = document.getElementById("bgm-controls");
            let bgmVolume = bgmNode.parentNode.removeChild(bgmNode);
            let nav = document.getElementById("quality-settings").parentNode;
            nav.insertBefore(bgmVolume, document.getElementById("quality-settings"));
            bgmVolume.classList.add("menu-item")
        }
        else {
            let bgmNode = document.getElementById("bgm-controls");
            let bgmVolume = bgmNode.parentNode.removeChild(bgmNode);
            let mainSection = document.getElementById("bgm").parentNode;
            mainSection.insertBefore(bgmVolume, document.getElementById("bgm").nextSibling);
            bgmVolume.classList.remove("menu-item")
        }
        
    })
    let data = await parseCSV(FISH_DATA_PATH);
    Aquarium.init(data).then(() => {        
        // Remove loading screen. We've loaded in everything
        let loader = document.getElementById("loader");

        loader.classList.add("done");
        loader.querySelector("progress").remove();
        loader.querySelector("label").remove();

        let enterPrompt = document.createElement("p");
        loader.ariaLabel = "Click to enter Interactive Aquarium";
        enterPrompt.innerText = "Click to \n Enter";
        loader.querySelector(".spinner-container").appendChild(enterPrompt);
        loader.onclick = () => {
            loader.classList.add("fade");
            setTimeout(() => {
                loader.remove();
            }, 600);

            document.getElementById("bgm").play();
        }
        
        Aquarium.addGameStateListener("onFishClicked", (fishData) => {
            // Open dialog info on selected fish
            updateDetailsDialog(fishData.idx, fishData.data);
            DETAILS_DIALOG_A11Y.show();
        });

        overlayToggle.checked = aquarium.overlay.visible;
    });

}

window.onload = () => {
    main();
}