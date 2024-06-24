import re

def analyze_contract(code):
    vulnerabilities = []

    # Check for reentrancy
    if re.search(r'\.call{value:', code) and not re.search(r'\.transfer\(', code):
        vulnerabilities.append({
            'name': 'Potential Reentrancy',
            'description': 'The contract uses .call() to send Ether. Consider using .transfer() or check-effects-interactions pattern.'
        })

    # Check for unchecked external calls
    if re.search(r'\.call\(', code) and not re.search(r'require\(.+\.call', code):
        vulnerabilities.append({
            'name': 'Unchecked External Call',
            'description': 'The contract makes external calls without checking the return value.'
        })

    # Check for use of tx.origin
    if 'tx.origin' in code:
        vulnerabilities.append({
            'name': 'Use of tx.origin',
            'description': 'tx.origin is used for authorization. This is vulnerable to phishing attacks.'
        })

    # Check for unprotected selfdestruct
    if 'selfdestruct' in code and not re.search(r'require\(.+\)\s*;\s*selfdestruct', code):
        vulnerabilities.append({
            'name': 'Unprotected Selfdestruct',
            'description': 'The contract can be destroyed without access controls.'
        })
          
      
return vulnerabilities
