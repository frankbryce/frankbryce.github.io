# Multi-Layer Cellular Automata

Last week, I added a folder to my github.io, [CSP_Cellular_Automata](https://frankbryce.github.io/CSP_Cellular_Automata/ca.html). The motivation for this was to test out ideas for what sorts of information causes itself to continue to exist. For CA, I wanted to see how many pattens repeat themselves, but not at the same location.

For this new case, I wanted to update the rules for CA to have TWO layers, and have the rules for each layer be different. They also interact with each other, where if both layers have a live cell in the same location, then the cell at the next step for each layer will be the result of the ruleset from the other layer.

To model this, I created a new app to display 2 layers, and have the rulesets for each layer be different. The UI for this models one layer as the color blue, and the other layer as the color orange. When both layers have a live cell in the same location, the cell will be white, and a dead cell is black.

The dynamics of this are non-obvious, even if both layers have the same rulesets. Look at a random grid for 2 layers of game of life rules.

![CA_random_multi_gol](CA_random_multi_gol.mp4)

With this multi-layer concept, I made another CSP to find walkers, and so far I have found 2 different types of walkers. The ["John Fish"](https://frankbryce.github.io/csp_multi_ca/ca.html?config=%7B%22gridSize%22%3A9%2C%22gridBlue%22%3A%22000000000000000000000000000001010000000001000001010000000000000000000000000000000%22%2C%22gridOrange%22%3A%22000000000000000000000010000000001000000011100000001000000010000000000000000000000%22%2C%22wrapAround%22%3Atrue%2C%22currentBlueRulesetIndex%22%3A0%2C%22currentOrangeRulesetIndex%22%3A1%2C%22rulesets%22%3A%5B%7B%22dead%22%3A%5B0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%5D%2C%22live%22%3A%5B0%2C1%2C1%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22dead%22%3A%5B0%2C0%2C0%2C1%2C0%2C1%2C1%2C0%2C0%5D%2C%22live%22%3A%5B0%2C0%2C1%2C1%2C1%2C0%2C1%2C0%2C0%5D%7D%5D%7D) is a horizontal walker, and the ["O Bear"](https://frankbryce.github.io/csp_multi_ca/ca.html?config=%7B%22gridSize%22%3A9%2C%22gridBlue%22%3A%22000000000000000000000010000000000000001001000000010000000000000000000000000000000%22%2C%22gridOrange%22%3A%22000000000000000000000010000000111000001101100000110000000010000000000000000000000%22%2C%22wrapAround%22%3Atrue%2C%22currentBlueRulesetIndex%22%3A0%2C%22currentOrangeRulesetIndex%22%3A1%2C%22rulesets%22%3A%5B%7B%22dead%22%3A%5B0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22live%22%3A%5B0%2C1%2C0%2C0%2C0%2C0%2C1%2C0%2C0%5D%7D%2C%7B%22dead%22%3A%5B0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22live%22%3A%5B0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D) is a diagonal walker.

![CA_John_Fish](CA_John_Fish.mp4)

![CA_O_Bear](CA_O_Bear.mp4)



