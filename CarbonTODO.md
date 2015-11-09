1) Button styles

- get rid of gradient highlights, hack up proper chili-esque style

- special color button is special, needs to have button style

2) Edges
- chat entry line has geborked border-image (element size too small for proper rendering)

- minor border-image corruptions on chat tabs (even if it looks cool)

3) Images need to be carbonized:

- checkboxes

- radiobuttons

- dropdown buttons

- tab selection buttons (when window made tiny)

- add more

4) Sliders need to be carbonized

- webkit allows browser scrollbars to be styled.

- use chili sliders for glory and profit.

5) Paddings

- chat active tab X-button is too far to right, overlays border-image


**wagonrepairer's list of visual bugs**

1) Dropdown buttons need updating to look like other buttons. Example: Team color selector bottom right.

2) Filtering Selects are better now but the black color of the options exactly matches the highlighted part of the options. Example: View Replay, start typing something in the Replay dropdown to filter the options. The filtered options have part of their text highlighted black but the options are also black, so it's not visible (though you can see it in action when hovering over an option).

3) Filtering Selects are a bit too tall and when they become outlined in red, the exclamation point graphic is warped. Compare to light skin using the View Replay section as well.

4) CheckBox Buttons (not regular checkboxes like in the settings tab) are invisible when unchecked. Example: Go to modoptions in most any game such as ZK and find boolean options.

5) Faction select is still black on black.

6) Buttons (and tabs) are much larger in dark skin and it is hard to reconcile their layout compared to light skin. This mostly affects small buttons that are intended to take up very little space on the UI so their layout needs to be exact. Example: See the New Chatroom button and its neighbors in lightskin, the way it is adjacent to the next button. In dark skin it's completely different. Same for the buttons in the channel topic (autojoin and subscribe) and some other places.