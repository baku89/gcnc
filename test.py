from bambu_connect import BambuClient
import os

# Replace these with your actual details
hostname = '10.0.1.6'
access_code = '30810494'
serial = '0309FA440100233'

codes = """M620 S0
M104 S250
G28 X
G91
G1 Z3.0 F1200
G90
G1 X70 F12000
G1 Y245
G1 Y265 F3000
M109 S250
G1 X120 F12000
G1 X20 Y50 F12000
G1 Y-3
T[next_tray_index]
G1 X54  F12000
G1 Y265
M400
M106 P1 S0
G92 E0
G1 E40 F200
M400
M109 S[new_filament_temp]
M400
M106 P1 S255
G92 E0
G1 E5 F300
M400
M106 P1 S0
G1 X70  F9000
G1 X76 F15000
G1 X65 F15000
G1 X76 F15000
G1 X65 F15000
G1 X70 F6000
G1 X100 F5000
G1 X70 F15000
G1 X100 F5000
G1 X70 F15000
G1 X165 F5000
G1 Y245
G91
G1 Z-3.0 F1200
G90
M621 S0"""


def main():
    bambu_client = BambuClient(hostname, access_code, serial)

    # IMPORTANT: Before executing gcode make sure the print bed is clear.
    #            The code is commented out to ensure you read this before executing it and possibly harming the printer

    # Example G-code for homing the printer
    bambu_client.send_gcode('G28')
    
    lines = codes.split('\n')
    for code in lines:
        print(code)
        bambu_client.send_gcode(code)


if __name__ == "__main__":
    main()