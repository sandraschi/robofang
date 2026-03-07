
print('Hello from Sandbox')
import os
import datetime
log_path = 'C:/Users/WDAGUtilityAccount/Desktop/exchange/sandbox/inner_test.log'
with open(log_path, 'w') as f:
    f.write(f'Inner test successful at {datetime.datetime.now()}')
