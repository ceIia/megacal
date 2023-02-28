# horizontal draggable timeline

![image](https://user-images.githubusercontent.com/25929147/221927707-1d3c02ad-9f2b-4dc5-8a76-e1b729559601.png)

this is a kinda a work in progress. i'm trying to build a horizontal draggable timeline.
heavily inspired by linear.

**TODO: (timeline)**
- [X] add a vertical bar to the current date
- [X] add the campaigns lines to the timeline
- [X] add intersection observers to append the next months and also load the campaigns
- [X] add a button to go to today
- [X] improve styling
- [X] improve vertical performance (using react-window)

**known issues:**
- if u scroll to fast on the sides, the intersection observers might trigger once, but since you're already too far, you've already scrolled past the new one, thus not adding new months. this could be avoided by restricting the max/min scroll offset, but even then, if your screen is too small, it still won't load the next months.
- wheel scroll works on X and Y.
- drag scroll only works on X.
- scroll bar is only visible vertically.

**potential improvements:**
- better lateral infinite scroll
- virtualize months
- move the vertical lines to be always visible (even pre data load)
- add loading skeleton
- add time density selector (months, years, ... currently quarter, kinda)
- refactor to an actual component
- possible offload or better UI for out of screen items

**type:**
```ts
type Campaign = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  onClick?: (id: string) => void;
};
```
