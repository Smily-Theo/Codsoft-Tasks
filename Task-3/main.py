import random
import string

print("================================")
print("       PASSWORD GENERATOR")
print("================================")

length = int(input("Enter password length: "))

# Allowed characters:
# Alphabets + Numbers + Special characters
characters = string.ascii_letters + string.digits + string.punctuation

password = ''.join(random.choice(characters) for _ in range(length))

print("\nGenerated Password:", password)