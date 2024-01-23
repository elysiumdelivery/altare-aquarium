export let DETAILS_DIALOG_A11Y = null;
let DETAILS_DIALOG_EL = null;

export async function setupDetailsDialog() {
  // Don't make another dialog container if a previous page already set it up
  if (document.getElementById("fish-details-dialog")) {
    return;
  }
  let html = await fetch("./details-dialog.html");
  html = await html.text();
  document.body.insertAdjacentHTML("beforeend", html);
  DETAILS_DIALOG_EL = document.getElementById("fish-details-dialog");
  // A11yDialog handles toggling accessibility properties when the dialog shows/ hides,
  // as well as closing on esc, clicking outside of the dialog, etc.
  DETAILS_DIALOG_A11Y = new A11yDialog(document.getElementById("fish-details"));
  DETAILS_DIALOG_A11Y.hide();
  console.log(DETAILS_DIALOG_A11Y)
}

export function updateDetailsDialog(id, data, cardUrl) {
  // TODO;
  // Header
  // Image -> `"images/thumbs/${data["Sea Level"]}/${data["Filename"]}.webp"`

  DETAILS_DIALOG_EL.className = data["Sea Level"].toLowerCase();

  DETAILS_DIALOG_EL.getElementsByClassName("dialog-title")[0].innerHTML = "";
  DETAILS_DIALOG_EL.getElementsByClassName(
    "dialog-title"
  )[0].insertAdjacentHTML(
    "beforeend",
    `
    <h2 class="fish-name">${data["Fish Display Name"]}</h2>
    <p><span><strong>Artist:</strong> ${data["Artist Credit"]}</span> | <span><strong>Writer:</strong> ${data["Writer Credit"]}</span></p>
  `
  );
  let fishImage = DETAILS_DIALOG_EL.getElementsByClassName(
    "details-dialog-img"
  )[0];
  fishImage.className = "details-dialog-img";
  fishImage.classList.add(`size_${data["Size Category"]}`);
  fishImage.src = `images/thumbs/${data["Filename"]}.webp`;

  // Clear + set card metadata
  DETAILS_DIALOG_EL.getElementsByClassName("details-dialog-text")[0].innerHTML =
    "";
    let detailsHTML = `<p class="fish-info">Size: ${data["Size"]} | Weight: ${data["Weight"]}</p>`
  detailsHTML += `<h3>Image Description</h3><p>${data["Fish Image Alt Text Description"]}</p>`;
  if (data["Description"]) {
    // Item card without attacks
    detailsHTML += `
      <h3>Description</h3>
      <p class="fish-description">${data["Description"]}</p>`;
  }
  DETAILS_DIALOG_EL.getElementsByClassName(
    "details-dialog-text"
  )[0].insertAdjacentHTML("beforeend", detailsHTML);
}
