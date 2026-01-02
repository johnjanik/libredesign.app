# DesignLibre Inspector Panel Layout

## Panel Structure

```
+----------------------------------+
|  INSPECTOR                    [x]|
+----------------------------------+
|  [Section 1]                     |
|  [Section 2]                     |
|  [Section 3]                     |
|  ...                             |
+----------------------------------+
```

---

## Section: Transform

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| X | number | 0 | -10000 to 10000 | X position |
| Y | number | 0 | -10000 to 10000 | Y position |
| W | number | 100 | 0 to 10000 | Width |
| H | number | 100 | 0 to 10000 | Height |
| Rotation | number + dial | 0 | -360 to 360 | Rotation degrees |
| Lock Aspect | toggle | off | on/off | Constrain proportions |

---

## Section: Fill

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Fill Color | color picker | #FFFFFF | any color | Fill color |
| Opacity | slider | 100 | 0 to 100 | Fill opacity % |
| Fill Type | dropdown | Solid | Solid, Gradient, Image | Fill style |
| + Add Fill | button | - | - | Add additional fill |

---

## Section: Stroke

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Stroke Color | color picker | #000000 | any color | Stroke color |
| Width | number | 1 | 0 to 100 | Stroke width px |
| Position | dropdown | Center | Inside, Center, Outside | Stroke alignment |
| Style | dropdown | Solid | Solid, Dashed, Dotted | Line style |
| Cap | icon toggle | Butt | Butt, Round, Square | Line cap style |
| Join | icon toggle | Miter | Miter, Round, Bevel | Line join style |

---

## Section: Effects

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Drop Shadow | toggle | off | on/off | Enable shadow |
|   Color | color picker | #000000 | any color | Shadow color |
|   X Offset | number | 0 | -100 to 100 | Horizontal offset |
|   Y Offset | number | 4 | -100 to 100 | Vertical offset |
|   Blur | number | 4 | 0 to 100 | Blur radius |
|   Spread | number | 0 | -100 to 100 | Spread radius |
| Blur | toggle | off | on/off | Enable blur |
|   Amount | number | 0 | 0 to 100 | Blur amount |

---

## Section: Typography (Text only)

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Font Family | dropdown | Inter | system fonts | Font family |
| Font Weight | dropdown | Regular | Thin to Black | Font weight |
| Size | number | 16 | 1 to 1000 | Font size px |
| Line Height | number | 1.5 | 0.5 to 10 | Line height ratio |
| Letter Spacing | number | 0 | -100 to 100 | Letter spacing px |
| Align | icon toggle | Left | Left, Center, Right, Justify | Text alignment |

---

## Section: Layout (Frames only)

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Auto Layout | toggle | off | on/off | Enable auto layout |
| Direction | icon toggle | Horizontal | Horizontal, Vertical | Layout direction |
| Gap | number | 10 | 0 to 1000 | Space between items |
| Padding | 4x number | 0 | 0 to 1000 | Top, Right, Bottom, Left |
| Align Items | icon toggle | Start | Start, Center, End | Cross-axis alignment |
| Justify | icon toggle | Start | Start, Center, End, Between | Main-axis alignment |

---

## Section: Constraints

| Property | Input Type | Default | Range/Options | Description |
|----------|------------|---------|---------------|-------------|
| Horizontal | dropdown | Left | Left, Right, Left+Right, Center, Scale | Horizontal constraint |
| Vertical | dropdown | Top | Top, Bottom, Top+Bottom, Center, Scale | Vertical constraint |

---

## Input Type Reference

| Type | Description | Example |
|------|-------------|---------|
| number | Numeric input with increment buttons | `[100]` `[-][+]` |
| slider | Horizontal slider with value | `[----o----] 50` |
| toggle | On/off switch | `[  o]` / `[o  ]` |
| dropdown | Select from list | `[Option v]` |
| color picker | Color swatch + picker | `[###] #FF0000` |
| icon toggle | Icon-based radio buttons | `[L] [C] [R]` |
| button | Clickable action | `[+ Add]` |
| 4x number | Four linked inputs | `[T] [R] [B] [L]` |

---

## Notes

- Indented properties (with spaces) are sub-properties shown when parent is enabled
- Add/remove sections as needed
- Reorder sections by moving entire blocks
