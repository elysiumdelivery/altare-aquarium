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
  DETAILS_DIALOG_EL.getElementsByClassName("dialog-title")[0].innerHTML = "";
  DETAILS_DIALOG_EL.getElementsByClassName(
    "dialog-title"
  )[0].insertAdjacentHTML(
    "beforeend",
    `
    <h2 class="fish-name">${data["Fish Display Name"]}</h2>
    <p class="fish-description">${data["Description"]}</p>
  `
  // TODO add more to this section
  );
}
