import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle2, Info, Download, Save, Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const vulnerabilityInfo = {
  "Reentrancy": {
    description: "A vulnerability where a contract can be interrupted during execution and re-entered before the first execution is completed.",
    mitigation: "Use the checks-effects-interactions pattern or a reentrancy guard.",
    link: "https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/"
  },
};

const App = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('solidity');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [history, setHistory] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [newSnippetName, setNewSnippetName] = useState('');
  const [selectedResults, setSelectedResults] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  useEffect(() => {
    fetchHistory();
    loadSnippets();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error('Failed to fetch history');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analysis history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const analyzeContract = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code, language }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      if (data.task_id) {
        await pollResult(data.task_id);
      } else {
        setResults(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const pollResult = async (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/result/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.state !== 'PENDING') {
            clearInterval(pollInterval);
            setResults(data.result);
            fetchHistory();
          }
        } else {
          throw new Error('Failed to fetch result');
        }
      } catch (error) {
        clearInterval(pollInterval);
        toast({
          title: "Error",
          description: "Failed to retrieve analysis result. Please try again.",
          variant: "destructive",
        });
      }
    }, 2000);
  };

  const saveSnippet = () => {
    if (newSnippetName && code) {
      const newSnippets = [...snippets, { name: newSnippetName, code, language }];
      setSnippets(newSnippets);
      localStorage.setItem('codeSnippets', JSON.stringify(newSnippets));
      setNewSnippetName('');
      toast({
        title: "Success",
        description: "Code snippet saved successfully.",
      });
    }
  };

  const loadSnippets = () => {
    const savedSnippets = localStorage.getItem('codeSnippets');
    if (savedSnippets) {
      setSnippets(JSON.parse(savedSnippets));
    }
  };

  const loadSnippet = (snippet) => {
    setCode(snippet.code);
    setLanguage(snippet.language);
  };

  const escapeCSV = (str) => {
    if (typeof str !== 'string') return str;
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const exportResults = async (format) => {
    setExportLoading(true);
    try {
      if (!results || !results.vulnerabilities) {
        throw new Error('No results to export');
      }

      let content = '';
      let fileName = '';
      let mimeType = '';

      if (format === 'csv') {
        content = 'Vulnerability,Description\n';
        content += results.vulnerabilities.map(v => `${escapeCSV(v.name)},${escapeCSV(v.description)}`).join('\n');
        fileName = 'vulnerabilities.csv';
        mimeType = 'text/csv;charset=utf-8;';
      } else if (format === 'json') {
        content = JSON.stringify(results, null, 2);
        fileName = 'vulnerabilities.json';
        mimeType = 'application/json;charset=utf-8;';
      } else {
        throw new Error('Unsupported export format');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Results exported successfully as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to export results: ${error.message}`,
        variant: "destructive",
      });
    }
    setExportLoading(false);
    setExportConfirmOpen(false);
  };

  const renderVulnerability = (vuln, index) => (
    <Alert key={index} variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{vuln.name}</AlertTitle>
      <AlertDescription>{vuln.description}</AlertDescription>
      {vulnerabilityInfo[vuln.name] && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2">More Info</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{vuln.name}</DialogTitle>
              <DialogDescription>
                {vulnerabilityInfo[vuln.name].description}
                <h4 className="font-bold mt-2">Mitigation:</h4>
                <p>{vulnerabilityInfo[vuln.name].mitigation}</p>
                <a href={vulnerabilityInfo[vuln.name].link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-2 inline-block">
                  Learn More
                </a>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </Alert>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white p-4 border-r">
        <h1 className="text-2xl font-bold mb-6">Smart Contract Auditor</h1>
        <nav>
          {['editor', 'results', 'history'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              className="w-full justify-start mb-2 capitalize"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </nav>
      </div>
      <main className="flex-1 p-6 overflow-y-auto">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Contract Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solidity">Solidity</SelectItem>
                    <SelectItem value="vyper">Vyper</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  className="min-h-[300px] mb-4 font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`Paste your ${language} contract here...`}
                />
                <div className="flex justify-between mb-4">
                  <Input
                    placeholder="Snippet name"
                    value={newSnippetName}
                    onChange={(e) => setNewSnippetName(e.target.value)}
                    className="w-2/3 mr-2"
                  />
                  <Button onClick={saveSnippet} className="w-1/3">
                    <Save className="mr-2 h-4 w-4" />
                    Save Snippet
                  </Button>
                </div>
                <Select onValueChange={(snippet) => loadSnippet(JSON.parse(snippet))}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Load Snippet" />
                  </SelectTrigger>
                  <SelectContent>
                    {snippets.map((snippet, index) => (
                      <SelectItem key={index} value={JSON.stringify(snippet)}>
                        {snippet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full"
                  onClick={analyzeContract}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Contract'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="results">
            {results && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.vulnerabilities.length > 0 ? (
                    <>
                      {results.vulnerabilities.map((vuln, index) => renderVulnerability(vuln, index))}
                      <div className="flex justify-end space-x-2 mt-4">
                        <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setExportFormat('csv')}>
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Export</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to export the results as CSV? This file may contain sensitive information.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>Cancel</Button>
                              <Button onClick={() => exportResults('csv')} disabled={exportLoading}>
                                {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Export
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setExportFormat('json')}>
                              <Download className="mr-2 h-4 w-4" />
                              Export JSON
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Export</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to export the results as JSON? This file may contain sensitive information.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>Cancel</Button>
                              <Button onClick={() => exportResults('json')} disabled={exportLoading}>
                                {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Export
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </>
                  ) : (
                    <Alert variant="default">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>No Vulnerabilities Detected</AlertTitle>
                      <AlertDescription>The analysis did not find any vulnerabilities in the contract.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.map((item, index) => (
                  <Card key={index} className="
                  {history.map((item, index) => (
                  <Card key={index} className="mb-4">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>Analysis from {new Date(item.created_at).toLocaleString()}</span>
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                                   } else {
                              setSelectedResults(selectedResults.filter(r => r.id !== item.id));
                            }
                          }}
                         </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {item.vulnerabilities.length > 0 ? (
                        item.vulnerabilities.map((vuln, vIndex) => renderVulnerability(vuln, vIndex))
                      ) : (
                        <Alert variant                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>No Vulnerabilities Detected</AlertTitle>
                          <AlertDescription>This analysis did not find any vulnerabilities.</AlertDescription>
                        </Alert>
                      )}
                         </Card>
                ))}
                {selectedResults.length > 1 && (
                  <Button onClick={compareResults} className="mt-4">
                    Compare Selected Results
                  </Button>
                )}
              </CardContent>
            </Card>
              </Tabs>
      </main>
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparison Results</DialogTitle>
          </DialogHeader>
          <div className="            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Vulnerability</th>
                  {selectedResults.map((result, index) => (
                               ))}
                </tr>
              </thead>
              <tbody>
                {comparisonResults.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="border px-4 py-2">{row.vulnera                    {row.results.map((result, colIndex) => (
                      <td key={colIndex} className="border px-4 py-2">
                        {result ? '✓' : '✗'}
                      </td>
                    ))}
                  </tr>
                              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const compareResults = () => {
  if (selectedResults.length < 2) {
    toast({
      title: "Error",
      desc      variant: "destructive",
    });
    return;
  }

  const allVulnerabilities = new Set();
  selectedResults.forEach(result => {
    result.vulnerabilities.forEach(vuln => {
      allVulnerabil    });
  });

  const comparisonResults = Array.from(allVulnerabilities).map(vulnName => {
    return {
      vulnerability: vulnName,
      results: selectedResults.map(result => 
        result.vulnerabilities.some(v => v.      )
    };
  });

  setComparisonResults(comparisonResults);
  setCompareDialogOpen(true);
};

export default App;
