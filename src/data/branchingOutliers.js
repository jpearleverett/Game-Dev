export const BRANCHING_OUTLIER_SETS = {
  '010B': {
    "attempts": 6,
    "sets": [
        {
            "optionKey": "A",
            "label": "Show Mercy",
            "theme": {
                "name": "MERCY",
                "icon": "\ud83d\udd4a\ufe0f",
                "summary": "Choose Mercy. Delay the arrest."
            },
            "words": [
                "INNOCENT",
                "SAVE",
                "PROMISE",
                "TRUST"
            ],
            "descriptions": {
                "INNOCENT": "INNOCENT implies she doesn't deserve prison.",
                "SAVE": "SAVE is your promise to protect her.",
                "PROMISE": "PROMISE binds you to her safety.",
                "TRUST": "TRUST is the currency of this choice."
            }
        },
        {
            "optionKey": "B",
            "label": "Enforce Law",
            "theme": {
                "name": "PUNISHMENT",
                "icon": "\u2696\ufe0f",
                "summary": "Choose Law. Execute the warrant."
            },
            "words": [
                "JAIL",
                "EXECUTION",
                "SENTENCE",
                "WARRANT"
            ],
            "descriptions": {
                "JAIL": "JAIL is the inevitable end of the law.",
                "EXECUTION": "EXECUTION of duty requires sacrifice.",
                "SENTENCE": "SENTENCE is passed by the system, not you.",
                "WARRANT": "WARRANT is the paper that demands action."
            }
        }
    ]
},
};
