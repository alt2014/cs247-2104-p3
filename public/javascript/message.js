function MessageBox(text, video) {
  var textBox = document.createElement("DIV");
  textBox.setAttribute("class", "message-box");
  textBox.appendChild(video);
  var textWrapper = document.createElement("P");
  textWrapper.innerHTML = text;
  textBox.appendChild(textWrapper);
  return textBox;

}
