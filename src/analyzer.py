from solidity_parser import parser
from slither import Slither
from slither.analyses.data_dependency.data_dependency import data_dependency
from slither.analyses.write import write
from slither.core.declarations import Function, Contract
from slither.slithir.operations import InternalCall, LowLevelCall, HighLevelCall
from slither.analyses.erc.erc20 import ERC20
from slither.analyses.erc.erc721 import ERC721
import re

def analyze_contract(code, language='solidity'):
    vulnerabilities = []

    if language.lower() == 'solidity':
        vulnerabilities = analyze_solidity(code)
    elif language.lower() == 'vyper':
        vulnerabilities = analyze_vyper(code)
    else:
        raise ValueError(f"Unsupported language: {language}")

    return {
        "contract_code": code,
        "vulnerabilities": vulnerabilities
    }

def analyze_solidity(code):
    vulnerabilities = []

    parsed_contract = parser.parse(code)

    slither = Slither(code)

    check_reentrancy(slither, vulnerabilities)
    check_unchecked_external_calls(slither, vulnerabilities)
    check_tx_origin(slither, vulnerabilities)
    check_unprotected_selfdestruct(slither, vulnerabilities)
    check_integer_overflow(slither, vulnerabilities)
    check_uninitialized_storage_pointers(slither, vulnerabilities)
    check_arbitrary_jump(slither, vulnerabilities)
    check_insufficient_gas(slither, vulnerabilities)
    check_locked_ether(slither, vulnerabilities)

    check_time_manipulation(slither, vulnerabilities)
    check_front_running(slither, vulnerabilities)
    check_dos_with_unexpected_revert(slither, vulnerabilities)
    check_weak_randomness(slither, vulnerabilities)
    check_incorrect_erc20_implementation(slither, vulnerabilities)
    check_incorrect_erc721_implementation(slither, vulnerabilities)

    analyze_inter_contract_calls(slither, vulnerabilities)

    return vulnerabilities

def analyze_vyper(code):
    vulnerabilities = []

    try:
        compiled = compiler.compile_code(code)
    except VyperException as e:
        return [{"name": "Compilation Error", "description": str(e)}]

    check_vyper_reentrancy(code, vulnerabilities)

    check_vyper_unchecked_send(code, vulnerabilities)

    check_vyper_timestamp_dependence(code, vulnerabilities)

    check_vyper_assembly_usage(code, vulnerabilities)

    check_vyper_deprecated_functions(code, vulnerabilities)

    check_vyper_uninitialized_state_variables(code, vulnerabilities)

    return vulnerabilities

def check_vyper_reentrancy(code, vulnerabilities):
    if re.search(r'@nonreentrant\(', code) is None and re.search(r'send\(', code):
        vulnerabilities.append({
            "name": "Potential Reentrancy",
            "description": "The contract uses send() without a nonreentrant decorator, which may be vulnerable to reentrancy attacks."
        })

def check_vyper_unchecked_send(code, vulnerabilities):
    if re.search(r'send\(.*\)', code) and not re.search(r'assert.*send\(', code):
        vulnerabilities.append({
            "name": "Unchecked Send",
            "description": "The contract uses send() without checking its return value, which may lead to silent failures."
        })

def check_vyper_timestamp_dependence(code, vulnerabilities):
    if re.search(r'block\.timestamp', code):
        vulnerabilities.append({
            "name": "Timestamp Dependence",
            "description": "The contract uses block.timestamp, which can be manipulated by miners to a certain degree."
        })

def check_vyper_assembly_usage(code, vulnerabilities):
    if re.search(r'assembly:', code):
        vulnerabilities.append({
            "name": "Assembly Usage",
            "description": "The contract uses inline assembly, which may introduce vulnerabilities if not carefully implemented."
        })

def check_vyper_deprecated_functions(code, vulnerabilities):
    deprecated_functions = ['sha3(', 'suicide(', 'blockhash(']
    for func in deprecated_functions:
        if re.search(func, code):
            vulnerabilities.append({
                "name": f"Deprecated Function: {func[:-1]}",
                "description": f"The contract uses the deprecated function {func[:-1]}. Consider using its recommended alternative."
            })

def check_vyper_uninitialized_state_variables(code, vulnerabilities):
    state_vars = re.findall(r'(\w+)\s*:\s*([\w\[\]]+)', code)
    initialized_vars = re.findall(r'self\.(\w+)\s*=', code)
    for var, type in state_vars:
        if var not in initialized_vars and type != 'constant':
            vulnerabilities.append({
                "name": "Uninitialized State Variable",
                "description": f"The state variable '{var}' is not initialized in the constructor."
            })

def check_reentrancy(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.is_payable and any(call for call in function.high_level_calls if call.is_balance_sensitive):
                vulnerabilities.append({
                    "name": "Potential Reentrancy",
                    "description": f"Function {function.name} is payable and makes external calls that may be susceptible to reentrancy attacks."
                })

def check_unchecked_external_calls(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            for call in function.low_level_calls:
                if not call.is_checked:
                    vulnerabilities.append({
                        "name": "Unchecked External Call",
                        "description": f"Function {function.name} makes an unchecked low-level call."
                    })

def check_tx_origin(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.is_using_tx_origin():
                vulnerabilities.append({
                    "name": "Use of tx.origin",
                    "description": f"Function {function.name} uses tx.origin for authorization, which is vulnerable to phishing attacks."
                })

def check_unprotected_selfdestruct(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.has_self_destruct() and not function.is_protected():
                vulnerabilities.append({
                    "name": "Unprotected Selfdestruct",
                    "description": f"Function {function.name} contains an unprotected selfdestruct operation."
                })


def check_time_manipulation(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.uses_block_timestamp:
                vulnerabilities.append({
                    'name': 'Timestamp Dependence',
                    'description': f'Function {function.name} uses block.timestamp. Miners can manipulate timestamps.'
                })

def check_front_running(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.is_payable and not function.is_constructor:
                vulnerabilities.append({
                    'name': 'Potential Front-Running Vulnerability',
                    'description': f'Payable function {function.name} might be susceptible to front-running attacks.'
                })

def check_dos_with_unexpected_revert(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            if function.is_payable and any(node.contains_require_or_assert() for node in function.nodes):
                vulnerabilities.append({
                    'name': 'Potential DoS with Unexpected Revert',
                    'description': f'Function {function.name} is payable and contains require/assert statements.'
                })

def check_weak_randomness(slither, vulnerabilities):
    weak_random_sources = ['block.timestamp', 'block.difficulty', 'blockhash']
    for contract in slither.contracts:
        for function in contract.functions:
            if any(source in str(function.slither_parser) for source in weak_random_sources):
                vulnerabilities.append({
                    'name': 'Weak Source of Randomness',
                    'description': f'Function {function.name} uses a weak source of randomness.'
                })

def check_incorrect_erc20_implementation(slither, vulnerabilities):
    for contract in slither.contracts:
        erc20 = ERC20(contract)
        if erc20.is_erc20() and not erc20.is_erc20_compliant():
            vulnerabilities.append({
                'name': 'Incorrect ERC20 Implementation',
                'description': f'Contract {contract.name} claims to be ERC20 but is not fully compliant.'
            })

def check_incorrect_erc721_implementation(slither, vulnerabilities):
    for contract in slither.contracts:
        erc721 = ERC721(contract)
        if erc721.is_erc721() and not erc721.is_erc721_compliant():
            vulnerabilities.append({
                'name': 'Incorrect ERC721 Implementation',
                'description': f'Contract {contract.name} claims to be ERC721 but is not fully compliant.'
            })

def analyze_inter_contract_calls(slither, vulnerabilities):
    for contract in slither.contracts:
        for function in contract.functions:
            for internal_call in function.internal_calls:
                if isinstance(internal_call, HighLevelCall):
                    called_contract = internal_call.contract_declarer
                    analyze_contract_interaction(contract, called_contract, function, internal_call, vulnerabilities)

def analyze_contract_interaction(caller_contract, called_contract, caller_function, call, vulnerabilities):
    if call.is_payable() and any(f.is_payable for f in called_contract.functions):
        vulnerabilities.append({
            'name': 'Potential Cross-Contract Reentrancy',
            'description': f'Function {caller_function.name} in {caller_contract.name} makes a payable call to {called_contract.name}, which has payable functions.'
        })

    if any(node.state_variables_written for node in caller_function.nodes_ordered[call.node.node_id:]):
        vulnerabilities.append({
            'name': 'State Change After External Call',
            'description': f'Function {caller_function.name} in {caller_contract.name} changes state after calling {called_contract.name}.'
        })

    if call.return_type and not call.return_type.type.is_void and not any(node.variables_read for node in caller_function.nodes_ordered[call.node.node_id:]):
        vulnerabilities.append({
            'name': 'Unused Return Value',
            'description': f'Function {caller_function.name} in {caller_contract.name} does not use the return value from {called_contract.name}.'
        })

    if not caller_function.is_protected() and call.function.is_protected():
        vulnerabilities.append({
            'name': 'Potential Access Control Issue',
            'description': f'Function {caller_function.name} in {caller_contract.name} is not protected but calls a protected function in {called_contract.name}.'
        })

    if call.call_value:
        vulnerabilities.append({
            'name': 'Potential Ether Leak',
            'description': f'Function {caller_function.name} in {caller_contract.name} sends ether to {called_contract.name}. Ensure this is intended.'
        })

    if isinstance(call, LowLevelCall) and call.is_delegate_call:
        vulnerabilities.append({
            'name': 'Delegatecall Usage',
            'description': f'Function {caller_function.name} in {caller_contract.name} uses delegatecall to interact with {called_contract.name}. This can be dangerous if not properly secured.'
        })
