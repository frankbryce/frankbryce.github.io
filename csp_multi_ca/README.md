Last week, I added a folder to my github.io called CSP_Cellular_Automata. The motivation for this was to test out ideas for what sorts of information causes itself to continue to exist. For CA, I wanted to see how many pattens repeat themselves, but not at the same location.

For this new case, I wanted to update the rules for CA to have TWO layers, and have the rules for each layer be different. They also interact with each other, where if both layers have a live cell in the same location, then the cell at the next step for each layer will be the result of the ruleset from the other layer.

To model this, I created a new app to display 2 layers, and have the rulesets for each layer be different. The UI for this models one layer as the color blue, and the other layer as the color orange. When both layers have a live cell in the same location, the cell will be white, and a dead cell is black.

The dynamics of this are non-obvious, even if both layers have the same rulesets. Look at a random grid for 2 layers of game of life rules.

![CA_random_multi_gol](CA_random_multi_gol.mp4)

With this multi-layer concept, I made another CSP to find walkers, and so far I have found 2 different types of walkers. The ["John Fish"]() is a horizontal walker, and the ["O Bear"]() is a diagonal walker.

![CA_John_Fish](CA_John_Fish.mp4)

![CA_O_Bear](CA_O_Bear.mp4)

