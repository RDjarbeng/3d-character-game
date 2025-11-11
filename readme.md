# 3D Game with Three.js and Reinforcement Learning

Welcome to the repository for my 3D game project, which incorporates Three.js for 3D rendering and a reinforcement learning (RL) agent to enhance gameplay dynamics. This project features a robot and an 'alien' character navigating through a custom-designed 3D environment.

## Project Overview

- **Gameplay Objective**: The primary goal is to minimize the time it takes for the RL agent to destroy all the pillars within the environment. Each pillar, when destroyed, scores 100 points, adding a competitive edge to the gameplay.

- **Environment**: A 3D space where the robot and 'alien' character interact with pillars. Here's a visual representation of the game:
  ![Game Environment](https://github.com/user-attachments/assets/bacb732f-66fa-417e-9b86-0d1a4e79ad4c)

## Reinforcement Learning Agent

- **Initial Setup**: The RL agent starts with an epsilon value of around 0.4. This means:
  - 40% of the actions taken by the agent are random (exploratory), allowing it to discover new strategies.
  - 60% of the actions are based on exploitation, maximizing reward based on previously learned information.

- **Learning Process**: As the game progresses, the epsilon value decreases, transitioning the agent from exploration to exploitation, refining its strategy over time.

- **Current Status**: The agent encountered an issue where it got stuck after destroying approximately 4 pillars. This is where development paused, but there's potential for further refinement.

## Features

- **Destruction Mechanics**: The game features dynamic explosions when the character impacts a pillar, enhancing the visual and interactive experience.
- **Scoring System**: Each pillar destroyed awards the player 100 points, encouraging efficiency and strategy in gameplay.

## Technologies Used

- **Three.js**: For rendering the 3D environment and characters.
- **ReactJS**: For managing the game's UI and state, if you're interested in contributing or experimenting with the RL agent.

## Getting Started

If you're interested in continuing the development or experimenting with the RL agent, here's what you need:

1. **Basic Knowledge**: Familiarity with ReactJS and 3D modeling would be beneficial.
2. **Environment Setup**: Ensure you have Node.js installed for ReactJS development.

## Follow the Development

For updates and progress on this project, follow me on [X (formerly Twitter)](https://x.com/DjarbengRichard/status/1883970511312675302).

## Acknowledgements

This project was made with [bolt.new](https://bolt.new).
Developer: <a href="https://rdjarbeng.com">Richard Djarbeng</a>

---

Feel free to fork the repository, contribute, or reach out with suggestions or questions. Let's bring this game to its full potential!
