# TO-DO-LIST

todo_list=[]

#Function to add a new task
def add_task():
    task=input("Enter your task: ")
    todo_list.append({"Task":task,"Status":"Pending"})
    print("New Task Added Successfully\n")

#Function to view All Task

def view_task():
    print("Your To-Do List:")
    if(len(todo_list)==0):
        print("No Pending Tasks")
    else:
        for index,task in enumerate(todo_list,1):
            print(f"{index}:{task['Task']} - {task['Status']}")
    print("\n")

#Function to Remove a Task

def remove_task():
    if(len(todo_list)==0):
        print("List is Empty")
    else:
        try:
            search_index=int(input("Enter the task number you want to remove: ")) -1
            if 0<=search_index<len(todo_list):
               removed_task=todo_list.pop(search_index)
               print(f"Task Removed Successfully: {removed_task['Task']}")
            else:
               print("Invalid Choice! Try again")
        except ValueError:
            print("Invalid Choice! Please valid Task Number")

#Function to Mark a Task as Done

def mark_done():
    if (len(todo_list) == 0):
        print("List is Empty")
    else:
        try:
            search_index = int(input("Enter the task number that you want to mark as Complete: ")) - 1
            if 0 <= search_index < len(todo_list):
                todo_list[search_index]["Status"]="Completed"
                print(f"Task {todo_list [search_index]['Task']} has been marked as Done")

            else:
                print("Invalid Choice! Try again")
        except ValueError:
            print("Invalid Choice! Please valid Task Number")



#Funtion to display a menu
def menu():
    while (True):
     print("                                                      ----- Welcome to the To-Do List -----")
     print("*** Main Menu ***")
     print("1. Add a New Task")
     print("2. View All Tasks")
     print("3. Remove a Task")
     print("4. Mark a Task as Completed")
     print("5. Exit")
     print("Choose(1-5)")

     choice=(int(input("Enter your choice: ")))
     if(choice==1):
         add_task()
     elif(choice==2):
         view_task()
     elif(choice==3):
         remove_task()
     elif(choice==4):
         mark_done()
     elif(choice==5):
         print("Thank you for your time !\nExiting the Application...")
         exit()
     else:
         print("Invalid Choice! Try again")

menu()

