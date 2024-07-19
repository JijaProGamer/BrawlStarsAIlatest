import numpy as np
import time
import mouse
import threading

time.sleep(2.5)

def move_mouse():
    while True:
        random_row = np.random.random_sample()*250
        random_col = np.random.random_sample()*25
        random_time = np.random.random_sample()*np.random.random_sample() * 100
        mouse.wheel(1000)
        time.sleep(random_time/50)
        mouse.wheel(-70000)
        mouse.move(random_row, random_col, absolute=False, duration=0.2)
        mouse.move(-random_row, -random_col, absolute=False, duration = 0.2)
        mouse.LEFT
        time.sleep(random_time)


x = threading.Thread(target=move_mouse)
x.start()