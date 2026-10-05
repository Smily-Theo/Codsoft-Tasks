import random


class RockPaperScissors:

    CHOICES = ("rock", "paper", "scissors")

    def __init__(self):
        self.player_score = 0
        self.computer_score = 0
        self.rounds = 0

    @staticmethod
    def display_welcome():
        """Display the game welcome message."""
        print("\n" + "=" * 50)
        print("           ROCK PAPER SCISSORS")
        print("=" * 50)
        print("Choose one of the following:")
        print("  1. Rock")
        print("  2. Paper")
        print("  3. Scissors")
        print("  4. Quit")
        print("=" * 50)

    @staticmethod
    def get_player_choice():
        """Get and validate the player's choice."""
        options = {
            "1": "rock",
            "2": "paper",
            "3": "scissors"
        }

        while True:
            choice = input("\nEnter your choice (1-4): ").strip().lower()

            if choice == "4" or choice == "quit":
                return "quit"

            if choice in options:
                return options[choice]

            if choice in RockPaperScissors.CHOICES:
                return choice

            print("Invalid choice. Please enter 1, 2, 3, or 4.")

    @staticmethod
    def get_computer_choice():
        """Generate a random choice for the computer."""
        return random.choice(RockPaperScissors.CHOICES)

    @staticmethod
    def determine_winner(player, computer):
        """Determine the winner of the current round."""
        if player == computer:
            return "tie"

        winning_combinations = {
            "rock": "scissors",
            "paper": "rock",
            "scissors": "paper"
        }

        if winning_combinations[player] == computer:
            return "player"

        return "computer"

    def display_result(self, player, computer, result):
        """Display the result of the current round."""
        print("\n" + "-" * 50)
        print(f"You chose      : {player.capitalize()}")
        print(f"Computer chose : {computer.capitalize()}")
        print("-" * 50)

        if result == "tie":
            print("Result         : It's a tie!")
        elif result == "player":
            print("Result         : You win this round!")
        else:
            print("Result         : Computer wins this round!")

    def display_score(self):
        """Display the current score."""
        print("\n" + "=" * 50)
        print("                     SCORE")
        print("=" * 50)
        print(f"Your Score     : {self.player_score}")
        print(f"Computer Score : {self.computer_score}")
        print(f"Rounds Played  : {self.rounds}")
        print("=" * 50)

    def play_round(self):
        """Play a single round."""
        player = self.get_player_choice()

        if player == "quit":
            return False

        computer = self.get_computer_choice()
        result = self.determine_winner(player, computer)

        self.rounds += 1

        if result == "player":
            self.player_score += 1
        elif result == "computer":
            self.computer_score += 1

        self.display_result(player, computer, result)
        self.display_score()

        return True

    def display_final_result(self):
        """Display the final game result."""
        print("\n" + "=" * 50)
        print("                  FINAL RESULT")
        print("=" * 50)

        if self.player_score > self.computer_score:
            print("Congratulations! You are the overall winner!")
        elif self.player_score < self.computer_score:
            print("Computer wins the game. Better luck next time!")
        else:
            print("The game ended in a draw!")

        print(f"\nYour Score     : {self.player_score}")
        print(f"Computer Score : {self.computer_score}")
        print(f"Total Rounds   : {self.rounds}")
        print("=" * 50)
        print("Thank you for playing!")
        print("=" * 50)


def main():
    """Main function to run the game."""
    game = RockPaperScissors()
    game.display_welcome()

    while game.play_round():
        pass

    game.display_final_result()


if __name__ == "__main__":
    main()

