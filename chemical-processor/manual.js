let { chemicals, newChemical } = require('./chemicals.js')
let { linkify } = require('./helpers.js')

function link_gs(s) {
	return `<a href="https://www.osha.gov/laws-regs/regulations/standardnumber/${ s.slice(0, 4) }/${ s.replace(/\([a-z]\)/, '') }#${ s }">${s}</a>`
}

let manual = {
	// Z-2
	"Benzene": {
		"name_add": "(Z37.40-1969)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
	                            "values": {
	                                "ppm": "25"
	                            },
								"max": "50 ppm (10 min)"
							}
						}
					}
				},
			}
		},
		"z2": true
	},
	"Beryllium &amp; beryllium compounds (as Be)": {
		"name_add": "(Z37.29-1970)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"max": "0.025 mg/m<sup>3</sup> (30 min)"
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "mgm3": "0.0002"
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "mgm3": "0.002"
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.025"
	                            },
	                            "duration": 480
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Cadmium fume (as Cd)": {
		"name_add": "(Z37.5-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.3"
	                            },
	                            "duration": 480
	                        }
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Cadmium dust (as Cd)": {
		"name_add": "(Z37.5-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.6"
	                            },
	                            "duration": 480
	                        }
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Carbon disulfide": {
		"name_add": "(Z37.3-1968)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "100 ppm (30 min)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": "1"
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 12
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 30
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Carbon tetrachloride": {
		"name_add": "(Z37.17-1967)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "200 ppm (5 min in any 3 hours)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 2
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 200
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Chromic acid and chromates": {
		"name_add": "(Z37-7-1971)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"values": {
									"mgm3": 0.1
								}
							}
						}
					}
				}
			}
		}
	},
	"Ethylene dibromide": {
		"name_add": "(Z37.31-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "50 ppm (5 min)"
							}
	                    }
	                }
	            }
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
	                            "values": {
	                                "ppm": .13
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	            "notes": [linkify('See Section 5219')]
	        }
	    },
		"z2": true
	},
	"Ethylene dichloride": {
		"name_add": "(Z37.21-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "200 ppm (5 min in any 3 hours)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 1
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 2
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 200
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Fluoride as dust": {
		"name_add": "(Z37.28-1969)",
		name: "Fluoride as dust",
		"standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 480
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 480
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	        "niosh_rel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 480
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	    },
		"z2": true
	},
	"Hydrogen fluoride": {
		"name_add": "(Z37.28-1969)",
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 0.4
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 1
	                            },
	                            "duration": 15
							}
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Hydrogen sulfide": {
		"name_add": "(Z37.2-1966)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "50 ppm (10 min once only if no other measurable exposure occurs.)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 15
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 50
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	'Mercury (Z37.8-1971)': {
		name: 'Mercury (Z37.8-1971)',
		z2: true,
		standards: {
			osha_pel: {
				forms: {
					Default: {
						durations: {
							ceiling: {
								values: {
									mgm3: 0.1
								},
								duration: 480
							}
						}
					}
				}
			},
			cal_osha_pel: {
				forms: {
					"Metallic and inorganic": {
						durations: {
							default: {
								values: {
									mgm3: 0.025
								},
								duration: 480
							}
						}
					}
				}
			},
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 600
							}
						}
					}
				}
			},
		}
	},
	"Methyl chloride": {
		"name_add": "(Z37.18-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "300 ppm (5 min in any 3 hours)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 50
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 300
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Methylene chloride": {
		"name_add": "(Z37.31-1970)",
		general_standard: [link_gs('1910.1052')],
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 125
	                            },
	                            "duration": 15
							},
	                    }
	                }
	            },
	            notes: [linkify("See Section 5202")]
	        }
	    },
		"z2": true
	},
	"Mercury (organo) alkyl compounds (as Hg)": {
		"name_add": "(Z37.30-1969)",
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "mgm3": 0.01
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "mgm3": 0.03
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "mgm3": 0.04
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            }
	        }
	    },
		"z2": true
	},
	"Styrene": {
		"name_add": "(Z37.15-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
								"max": "600 ppm (5 min in any 3 hours)"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 50
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 500
	                            },
	                            "duration": 480
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Tetrachloroethylene": {
		"name_add": "(Z37.31-1970)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"max": "300 ppm (5 min in any 3 hours)"
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 300
	                            },
	                            "duration": 480
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Toluene": {
		"name_add": "(Z37.12-1967)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"max": "500 ppm (10 min)"
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 150
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 500
	                            },
	                            "duration": 480
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Trichloroethylene": {
		"name_add": "(Z37.19-1967)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"max": "300 ppm (5 min in any 2 hours)"
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 300
	                            },
	                            "duration": 480
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},

}

let z3 = [
	'Silica, crystalline (as respirable dust)',
	'Silica, amorphous', 
	'Mica (containing less than 1% quartz)', 
	'Soapstone (containing less than 1% quartz)', 
	'Talc (containing no asbestos and less than 1% quartz)',
	'Talc (containing asbestos and less than 1% crystalline silica)',
	'Tremolite, asbestiform',
	'Asbestos',
	'Portland cement',
	'Graphite (natural)',
	'Coal dust',
	'Inert or Nuisance Dust'
]

// console.log(chemicals)
for(let name in manual) {
	if(chemicals[name]) {
		chemicals[name].merge(manual[name], true)
		if(manual[name].name_add) {
			chemicals[name].name += ' ' + manual[name].name_add
		}
	} else {
		newChemical(manual[name])
		if(manual[name].name_add) {
			chemicals[name].name += ' ' + manual[name].name_add
		}
	}
}

for(let name of z3) {
	if(chemicals[name]) {
		chemicals[name].z3 = true
	} else {
		newChemical({ name, z3: true })
	}
}

// remove NPG max peaks
let max_peaks = {
	'(30 minutes), with a maximum peak of 0.025 mg/m3': chemicals["Beryllium &amp; beryllium compounds (as Be)"].standards.osha_pel,
	'100 ppm (30-minute maximum peak)': chemicals["Carbon disulfide"].standards.osha_pel,
	'200 ppm (5-minute maximum peak in any 4 hours)': chemicals["Carbon tetrachloride"].standards.osha_pel,
	'50 ppm [5-minute maximum peak]': chemicals["Ethylene dibromide"].standards.osha_pel,
	'200 ppm [5-minute maximum peak in any 3 hours]': chemicals["Ethylene dichloride"].standards.osha_pel,
	'[10-minute maximum peak]': chemicals["Hydrogen sulfide"].standards.osha_pel,
	'300 ppm (5-minute maximum peak in any 3 hours)': chemicals["Methyl chloride"].standards.osha_pel,
	'600 ppm (5-minute maximum peak in any 3 hours)': chemicals["Styrene"].standards.osha_pel,
	'(for 5 minutes in any 3-hour period), with a maximum peak of 300 ppm': chemicals["Tetrachloroethylene"].standards.osha_pel,
	'500 ppm (10-minute maximum peak)': chemicals["Toluene"].standards.osha_pel,
	'300 ppm (5-minute maximum peak in any 2 hours)': chemicals["Trichloroethylene"].standards.osha_pel,
}

for(let note in max_peaks) {
	for(let i = 0; i < max_peaks[note].notes.length; i++) {
		max_peaks[note].notes[i] = max_peaks[note].notes[i].replace(note, '')
		if(max_peaks[note].notes[i].trim() == '') max_peaks[note].notes.splice( i, 1 )
	}
}


